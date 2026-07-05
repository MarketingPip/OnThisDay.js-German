/**!
 * @license OnThisDay.js - A JavaScript library to find out what events happened today or any day in history.
 * VERSION: 3.0.0
 * CREATED BY: Jared Van Valkengoed
 * LICENSED UNDER MIT LICENSE
 * MORE INFO CAN BE FOUND AT https://github.com/MarketingPipeline/OnThisDay.js/
 */

const API_BASE = 'https://api.wikimedia.org/feed/v1/wikipedia';
const VALID_TYPES = ['all', 'events', 'births', 'deaths', 'holidays', 'selected'];
const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function isLeapYear(year) {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

export function getDaysInMonth(month, year) {
  if (month === 2 && isLeapYear(year)) return 29;
  return DAYS_IN_MONTH[month - 1];
}

function pad(n) {
  return String(n).padStart(2, '0');
}

function resolveArgs(a, b, c) {
  let month, day, options;

  if (a == null) {
    const now = new Date();
    month = now.getMonth() + 1;
    day = now.getDate();
    options = b || {};
  } else if (typeof a === 'object') {
    month = a.month;
    day = a.day;
    options = b || {};
  } else {
    month = a;
    day = b;
    options = c || {};
  }

  month = Number(month);
  day = Number(day);

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error(`Invalid month: ${month}. Must be an integer between 1 and 12.`);
  }
  if (!Number.isInteger(day) || day < 1 || day > 31) {
    throw new Error(`Invalid day: ${day}. Must be an integer between 1 and 31.`);
  }

  const year = options.year ?? new Date().getFullYear();
  const maxDays = getDaysInMonth(month, year);
  if (day > maxDays) {
    throw new Error(`Invalid date: ${month}/${day}. Month ${month} only has ${maxDays} days in ${year}.`);
  }

  const lang = options.lang ?? 'en';
  if (typeof lang !== 'string' || lang.length < 2) {
    throw new Error(`Invalid language code: "${lang}". Must be a valid Wikipedia language code.`);
  }

  return {
    month: pad(month),
    day: pad(day),
    lang,
    type: options.type || 'all',
    timeout: options.timeout ?? 10000
  };
}

export function normalizeItem(item) {
  if (!item || typeof item !== 'object') {
    return { year: null, event: '' };
  }
  return {
    year: item.year ?? null,
    event: item.text ?? item.event ?? ''
  };
}

export function normalize(data, type) {
  const base = { events: [], births: [], deaths: [], holidays: [], selected: [] };
  if (type !== 'all') {
    base[type] = (Array.isArray(data) ? data : []).map(normalizeItem);
    return base;
  }
  const d = typeof data === 'object' && data !== null ? data : {};
  return {
    events:   (d.events   || []).map(normalizeItem),
    births:   (d.births   || []).map(normalizeItem),
    deaths:   (d.deaths   || []).map(normalizeItem),
    holidays: (d.holidays || []).map(normalizeItem),
    selected: (d.selected || []).map(normalizeItem)
  };
}

export function packageRaw(data, type) {
  const base = { events: [], births: [], deaths: [], holidays: [], selected: [] };
  if (type !== 'all') {
    base[type] = Array.isArray(data) ? data : [];
    return base;
  }
  const d = typeof data === 'object' && data !== null ? data : {};
  return {
    events:   d.events   || [],
    births:   d.births   || [],
    deaths:   d.deaths   || [],
    holidays: d.holidays || [],
    selected: d.selected || []
  };
}

export async function OnThisDay(a, b, c) {
  const { month, day, lang, type, timeout } = resolveArgs(a, b, c);

  if (!VALID_TYPES.includes(type)) {
    throw new Error(`Invalid type "${type}". Valid: ${VALID_TYPES.join(', ')}`);
  }

  const url = `${API_BASE}/${encodeURIComponent(lang)}/onthisday/${encodeURIComponent(type)}/${month}/${day}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  let res;
  try {
    res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'OnThisDay.js/4.1.0 (https://github.com/MarketingPipeline/OnThisDay.js)'
      }
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeout}ms.`);
    }
    throw new Error(`Network error: ${err.message}`);
  }
  clearTimeout(timeoutId);

  if (!res.ok) {
    if (res.status === 404) {
      throw new Error(`No data found for ${month}/${day} in language "${lang}".`);
    }
    throw new Error(`Wikimedia API error ${res.status}: ${res.statusText}`);
  }

  let raw;
  try {
    raw = await res.json();
  } catch (err) {
    throw new Error(`Invalid JSON response: ${err.message}`);
  }

  const normalized = normalize(raw, type);
  const rawStore = packageRaw(raw, type);

  return {
    getEvents:   () => [...normalized.events],
    getBirths:   () => [...normalized.births],
    getDeaths:   () => [...normalized.deaths],
    getHolidays: () => [...normalized.holidays],
    getSelected: () => [...normalized.selected],
    getAll:      () => ({
      events:   [...normalized.events],
      births:   [...normalized.births],
      deaths:   [...normalized.deaths],
      holidays: [...normalized.holidays],
      selected: [...normalized.selected]
    }),
    getRaw:      () => ({
      events:   [...rawStore.events],
      births:   [...rawStore.births],
      deaths:   [...rawStore.deaths],
      holidays: [...rawStore.holidays],
      selected: [...rawStore.selected]
    }),
    ...normalized
  };
}
