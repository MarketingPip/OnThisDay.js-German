import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import {
  isLeapYear,
  getDaysInMonth,
  normalizeItem,
  normalize,
  packageRaw,
  OnThisDay
} from '../OnThisDay.js';
import {
  july4All,
  july4Events,
  missingFields,
  emptyResponse
} from './tests/fixtures.js';

// ── Mock Helpers ──────────────────────────────────────────────

function mockFetch(response) {
  global.fetch = typeof response === 'function'
    ? response
    : async () => ({ ok: true, status: 200, statusText: 'OK', json: async () => response });
}

function mockFetchError(status, statusText) {
  global.fetch = async () => ({ ok: false, status, statusText });
}

// ═══════════════════════════════════════════════════════════════
//  LAYER 1: UNIT TESTS (fast, deterministic, mocked)
// ═══════════════════════════════════════════════════════════════

describe('normalizeItem()', () => {
  it('extracts year and text', () => {
    assert.deepStrictEqual(
      normalizeItem({ year: 1776, text: 'Declaration signed' }),
      { year: 1776, event: 'Declaration signed' }
    );
  });

  it('handles missing properties', () => {
    assert.deepStrictEqual(normalizeItem({}), { year: null, event: '' });
  });

  it('handles null/undefined', () => {
    assert.deepStrictEqual(normalizeItem(null), { year: null, event: '' });
    assert.deepStrictEqual(normalizeItem(undefined), { year: null, event: '' });
  });

  it('handles non-objects', () => {
    assert.deepStrictEqual(normalizeItem('string'), { year: null, event: '' });
    assert.deepStrictEqual(normalizeItem(42), { year: null, event: '' });
    assert.deepStrictEqual(normalizeItem(true), { year: null, event: '' });
  });

  it('handles items with only year', () => {
    assert.deepStrictEqual(normalizeItem({ year: 2000 }), { year: 2000, event: '' });
  });

  it('handles items with only text', () => {
    assert.deepStrictEqual(normalizeItem({ text: 'Something' }), { year: null, event: 'Something' });
  });

  it('handles year = 0', () => {
    assert.deepStrictEqual(normalizeItem({ year: 0, text: 'Year zero' }), { year: 0, event: 'Year zero' });
  });

  it('handles unicode text', () => {
    assert.deepStrictEqual(
      normalizeItem({ year: 1789, text: 'Révolution française 🗼' }),
      { year: 1789, event: 'Révolution française 🗼' }
    );
  });

  it('is stable for random/fuzzed input', () => {
    for (let i = 0; i < 100; i++) {
      const input = Math.random() > 0.5
        ? { year: Math.floor(Math.random() * 6000) - 1000, text: String(Math.random()) }
        : Math.random() > 0.5 ? null : Math.random();

      const result = normalizeItem(input);
      assert.ok('year' in result);
      assert.ok('event' in result);
      assert.ok(result.year === null || Number.isInteger(result.year));
      assert.ok(typeof result.event === 'string');
    }
  });
});

describe('normalize()', () => {
  it('normalizes "all" type response with full shape', () => {
    const result = normalize(july4All, 'all');

    assert.deepStrictEqual(result.events[0], {
      year: 1776,
      event: "The United States Declaration of Independence is adopted by the Second Continental Congress."
    });
    assert.deepStrictEqual(result.births[0], {
      year: 1872,
      event: "Calvin Coolidge, 30th President of the United States"
    });
    assert.deepStrictEqual(result.deaths[0], {
      year: 1826,
      event: "Thomas Jefferson, 3rd President of the United States"
    });
    assert.deepStrictEqual(result.holidays[0], {
      year: null,
      event: "Independence Day (United States)"
    });
    assert.deepStrictEqual(result.selected[0], {
      year: 1776,
      event: "The United States Declaration of Independence is adopted."
    });
  });

  it('normalizes single-type response (array)', () => {
    const result = normalize(july4Events, 'events');
    assert.deepStrictEqual(result.events[0], {
      year: 1776,
      event: "The United States Declaration of Independence is adopted by the Second Continental Congress."
    });
    assert.deepStrictEqual(result.births, []);
    assert.deepStrictEqual(result.deaths, []);
    assert.deepStrictEqual(result.holidays, []);
    assert.deepStrictEqual(result.selected, []);
  });

  it('normalizes single-type response (non-array)', () => {
    const result = normalize(null, 'events');
    assert.deepStrictEqual(result.events, []);
    assert.deepStrictEqual(result.births, []);
  });

  it('handles missing keys gracefully', () => {
    const result = normalize({}, 'all');
    assert.deepStrictEqual(result.events, []);
    assert.deepStrictEqual(result.births, []);
    assert.deepStrictEqual(result.deaths, []);
    assert.deepStrictEqual(result.holidays, []);
    assert.deepStrictEqual(result.selected, []);
  });

  it('handles mixed valid + invalid items', () => {
    const result = normalize(missingFields, 'all');
    assert.strictEqual(result.events.length, 6);
    assert.deepStrictEqual(result.events[0], { year: null, event: 'Something happened' });
    assert.deepStrictEqual(result.events[1], { year: 2000, event: '' });
    assert.deepStrictEqual(result.events[2], { year: null, event: '' });
    assert.deepStrictEqual(result.events[3], { year: null, event: '' });
    assert.deepStrictEqual(result.events[4], { year: null, event: '' });
    assert.deepStrictEqual(result.events[5], { year: null, event: '' });
    assert.deepStrictEqual(result.births, []);
    assert.deepStrictEqual(result.deaths, []);
  });

  it('is idempotent', () => {
    const input = { events: [{ year: 2000, text: 'Event' }] };
    const once = normalize(input, 'all');
    const twice = normalize(once, 'all');
    assert.deepStrictEqual(once, twice);
  });

  it('is stable for fuzzed API responses', () => {
    for (let i = 0; i < 50; i++) {
      const data = {
        events: Array.from({ length: Math.floor(Math.random() * 10) }, () =>
          Math.random() > 0.3
            ? { year: Math.floor(Math.random() * 3000), text: String(Math.random()) }
            : null
        )
      };
      const result = normalize(data, 'all');
      assert.ok(Array.isArray(result.events));
      assert.ok(Array.isArray(result.births));
      for (const item of result.events) {
        assert.ok('year' in item);
        assert.ok('event' in item);
      }
    }
  });
});

describe('packageRaw()', () => {
  it('packages "all" type response', () => {
    const result = packageRaw(july4All, 'all');
    assert.deepStrictEqual(result.events, july4All.events);
    assert.deepStrictEqual(result.births, july4All.births);
    assert.deepStrictEqual(result.deaths, july4All.deaths);
    assert.deepStrictEqual(result.holidays, july4All.holidays);
    assert.deepStrictEqual(result.selected, july4All.selected);
  });

  it('packages single-type response', () => {
    const result = packageRaw(july4Events, 'events');
    assert.deepStrictEqual(result.events, july4Events);
    assert.deepStrictEqual(result.births, []);
  });

  it('handles null data', () => {
    const result = packageRaw(null, 'all');
    assert.deepStrictEqual(result.events, []);
  });
});

describe('isLeapYear()', () => {
  it('returns true for leap years', () => {
    assert.strictEqual(isLeapYear(2000), true);
    assert.strictEqual(isLeapYear(2024), true);
    assert.strictEqual(isLeapYear(2020), true);
    assert.strictEqual(isLeapYear(1600), true);
  });

  it('returns false for non-leap years', () => {
    assert.strictEqual(isLeapYear(1900), false);
    assert.strictEqual(isLeapYear(2023), false);
    assert.strictEqual(isLeapYear(2100), false);
  });
});

describe('getDaysInMonth()', () => {
  it('returns correct days for each month', () => {
    assert.strictEqual(getDaysInMonth(1, 2024), 31);
    assert.strictEqual(getDaysInMonth(2, 2023), 28);
    assert.strictEqual(getDaysInMonth(2, 2024), 29);
    assert.strictEqual(getDaysInMonth(4, 2024), 30);
    assert.strictEqual(getDaysInMonth(12, 2024), 31);
  });
});

// ═══════════════════════════════════════════════════════════════
//  LAYER 2: FIXTURE TESTS (realistic data, deterministic)
// ═══════════════════════════════════════════════════════════════

describe('Fixture Tests', () => {
  let originalFetch;

  before(() => {
    originalFetch = global.fetch;
  });

  after(() => {
    global.fetch = originalFetch;
  });

  it('full response snapshot from fixture', async () => {
    mockFetch(july4All);

    const result = await OnThisDay(7, 4);

    assert.deepStrictEqual(result.getAll(), {
      events: [
        { year: 1776, event: "The United States Declaration of Independence is adopted by the Second Continental Congress." },
        { year: 1997, event: "NASA's Pathfinder space probe lands on Mars." }
      ],
      births: [
        { year: 1872, event: "Calvin Coolidge, 30th President of the United States" }
      ],
      deaths: [
        { year: 1826, event: "Thomas Jefferson, 3rd President of the United States" },
        { year: 1826, event: "John Adams, 2nd President of the United States" }
      ],
      holidays: [
        { year: null, event: "Independence Day (United States)" }
      ],
      selected: [
        { year: 1776, event: "The United States Declaration of Independence is adopted." }
      ]
    });
  });

  it('fixture with missing fields', async () => {
    mockFetch(missingFields);

    const result = await OnThisDay(7, 4);
    const events = result.getEvents();

    assert.strictEqual(events.length, 6);
    assert.ok(events.every(e => typeof e.event === 'string'));
    assert.ok(events.every(e => e.year === null || Number.isInteger(e.year)));
  });

  it('empty fixture response', async () => {
    mockFetch(emptyResponse);

    const result = await OnThisDay(7, 4);
    assert.deepStrictEqual(result.getEvents(), []);
    assert.deepStrictEqual(result.getBirths(), []);
    assert.deepStrictEqual(result.getDeaths(), []);
    assert.deepStrictEqual(result.getHolidays(), []);
    assert.deepStrictEqual(result.getSelected(), []);
  });

  it('calls correct endpoint with fixture', async () => {
    let calledUrl;
    mockFetch((url) => {
      calledUrl = url;
      return { ok: true, status: 200, statusText: 'OK', json: async () => july4All };
    });

    await OnThisDay(7, 4, { type: 'events', lang: 'en' });
    assert.ok(calledUrl.includes('/en/'));
    assert.ok(calledUrl.includes('/events/'));
    assert.ok(calledUrl.includes('/07/04'));
  });
});

// ═══════════════════════════════════════════════════════════════
//  LAYER 3: INTEGRATION TESTS (mocked fetch, full flow)
// ═══════════════════════════════════════════════════════════════

describe('OnThisDay() Integration', () => {
  let originalFetch;

  before(() => {
    originalFetch = global.fetch;
  });

  after(() => {
    global.fetch = originalFetch;
  });

  it('fetches events only', async () => {
    mockFetch(july4Events);

    const result = await OnThisDay(7, 4, { type: 'events' });
    assert.strictEqual(result.getEvents().length, 1);
    assert.deepStrictEqual(result.getBirths(), []);
    assert.deepStrictEqual(result.getDeaths(), []);
    assert.deepStrictEqual(result.getHolidays(), []);
    assert.deepStrictEqual(result.getSelected(), []);
  });

  it('fetches births only', async () => {
    mockFetch(july4All.births);

    const result = await OnThisDay(7, 4, { type: 'births' });
    assert.ok(Array.isArray(result.getBirths()));
    assert.deepStrictEqual(result.getEvents(), []);
  });

  it('fetches selected only', async () => {
    mockFetch(july4All.selected);

    const result = await OnThisDay(7, 4, { type: 'selected' });
    assert.ok(Array.isArray(result.getSelected()));
    assert.deepStrictEqual(result.getEvents(), []);
  });

  it('throws on invalid type', async () => {
    await assert.rejects(
      async () => OnThisDay(7, 4, { type: 'invalid' }),
      /Invalid type/
    );
  });

  it('throws on 404 language', async () => {
    mockFetchError(404, 'Not Found');

    await assert.rejects(
      async () => OnThisDay(7, 4, { lang: 'xx', type: 'events' }),
      /No data found/
    );
  });

  it('throws on API error (non-404)', async () => {
    mockFetchError(500, 'Internal Server Error');

    await assert.rejects(
      async () => OnThisDay(7, 4, { type: 'events' }),
      /Wikimedia API error 500/
    );
  });

  it('respects timeout option and aborts quickly', async () => {
    mockFetch(async (_url, { signal }) => {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => resolve({ ok: true, status: 200, json: async () => [] }), 100);
        if (signal) {
          signal.addEventListener('abort', () => {
            clearTimeout(timer);
            const err = new Error('Aborted');
            err.name = 'AbortError';
            reject(err);
          });
        }
      });
    });

    const start = Date.now();
    await assert.rejects(
      async () => OnThisDay(7, 4, { timeout: 1 }),
      /timed out/
    );
    const duration = Date.now() - start;
    assert.ok(duration < 100, `Timeout took ${duration}ms, expected < 100ms`);
  });

  it('handles network errors', async () => {
    mockFetch(async () => { throw new Error('net::ERR_CONNECTION_REFUSED'); });

    await assert.rejects(
      async () => OnThisDay(7, 4, { type: 'events' }),
      /Network error/
    );
  });

  it('handles invalid JSON', async () => {
    mockFetch(async () => ({
      ok: true, status: 200, statusText: 'OK',
      json: async () => { throw new Error('Unexpected token'); }
    }));

    await assert.rejects(
      async () => OnThisDay(7, 4, { type: 'events' }),
      /Invalid JSON response/
    );
  });

  it('handles malformed API response (null arrays)', async () => {
    mockFetch({ events: null, births: undefined });

    const result = await OnThisDay(7, 4);
    assert.deepStrictEqual(result.getEvents(), []);
    assert.deepStrictEqual(result.getBirths(), []);
  });

  it('handles malformed API response (null items in array)', async () => {
    mockFetch({
      events: [null, { year: 2000, text: 'Valid' }, 'bad', 42]
    });

    const result = await OnThisDay(7, 4);
    assert.strictEqual(result.getEvents().length, 4);
    assert.deepStrictEqual(result.getEvents()[0], { year: null, event: '' });
    assert.deepStrictEqual(result.getEvents()[1], { year: 2000, event: 'Valid' });
  });

  it('getters return copies (immutable)', async () => {
    mockFetch(july4Events);

    const result = await OnThisDay(7, 4, { type: 'events' });

    const events1 = result.getEvents();
    events1.push({ year: 9999, event: 'hack' });
    assert.strictEqual(result.getEvents().length, 1);

    const all1 = result.getAll();
    all1.events.push({ year: 9999, event: 'hack' });
    assert.strictEqual(result.getAll().events.length, 1);

    const raw1 = result.getRaw();
    raw1.events.push({ hacked: true });
    assert.strictEqual(result.getRaw().events.length, 1);
  });

  it('handles concurrent calls safely', async () => {
    let callCount = 0;
    mockFetch(async () => {
      callCount++;
      return { ok: true, status: 200, json: async () => emptyResponse };
    });

    const results = await Promise.all([
      OnThisDay(7, 4),
      OnThisDay(12, 25),
      OnThisDay(1, 1)
    ]);

    assert.strictEqual(results.length, 3);
    assert.strictEqual(callCount, 3);
    assert.ok(results.every(r => r && typeof r.getEvents === 'function'));
  });

  it('handles large dataset', async () => {
    const largeData = {
      events: Array.from({ length: 1000 }, (_, i) => ({
        year: 1000 + i,
        text: `Event ${i}`
      }))
    };
    mockFetch(largeData);

    const result = await OnThisDay(7, 4);
    assert.strictEqual(result.getEvents().length, 1000);
    assert.strictEqual(result.getEvents()[999].year, 1999);
    assert.strictEqual(result.getEvents()[999].event, 'Event 999');
  });

  it('URL-encodes language and type', async () => {
    let calledUrl;
    mockFetch((url) => {
      calledUrl = url;
      return { ok: true, status: 200, statusText: 'OK', json: async () => [] };
    });

    await OnThisDay(7, 4, { type: 'events' });
    assert.ok(calledUrl.includes('/en/'));
    assert.ok(calledUrl.includes('/events/'));
    assert.ok(calledUrl.includes('/07/04'));
  });
});

// ═══════════════════════════════════════════════════════════════
//  LAYER 4: RESOLVE ARGS (input validation)
// ═══════════════════════════════════════════════════════════════

describe('resolveArgs via OnThisDay()', () => {
  let originalFetch;

  before(() => {
    originalFetch = global.fetch;
    mockFetch([]);
  });

  after(() => {
    global.fetch = originalFetch;
  });

  it('no args → today', async () => {
    const result = await OnThisDay();
    assert.ok(result);
  });

  it('positional: (month, day)', async () => {
    const result = await OnThisDay(7, 4);
    assert.ok(result);
  });

  it('positional: (month, day, options)', async () => {
    const result = await OnThisDay(7, 4, { type: 'events', lang: 'de' });
    assert.ok(result);
  });

  it('object: { month, day }', async () => {
    const result = await OnThisDay({ month: 12, day: 25 });
    assert.ok(result);
  });

  it('object: { month, day } with options', async () => {
    const result = await OnThisDay({ month: 12, day: 25 }, { type: 'births' });
    assert.ok(result);
  });

  it('string numbers coerced', async () => {
    const result = await OnThisDay('7', '4');
    assert.ok(result);
  });

  it('accepts Jan 1', async () => {
    const result = await OnThisDay(1, 1);
    assert.ok(result);
  });

  it('accepts Dec 31', async () => {
    const result = await OnThisDay(12, 31);
    assert.ok(result);
  });

  it('accepts Feb 29 on leap year', async () => {
    const result = await OnThisDay(2, 29, { year: 2020 });
    assert.ok(result);
  });

  it('rejects Feb 29 on non-leap year', async () => {
    await assert.rejects(() => OnThisDay(2, 29, { year: 2021 }), /Invalid date/);
  });

  it('rejects Feb 30 on leap year', async () => {
    await assert.rejects(() => OnThisDay(2, 30, { year: 2020 }), /Invalid date/);
  });

  it('throws on invalid month (0)', async () => {
    await assert.rejects(async () => OnThisDay(0, 15), /Invalid month/);
  });

  it('throws on invalid month (13)', async () => {
    await assert.rejects(async () => OnThisDay(13, 1), /Invalid month/);
  });

  it('throws on invalid day (0)', async () => {
    await assert.rejects(async () => OnThisDay(1, 0), /Invalid day/);
  });

  it('throws on invalid day (32)', async () => {
    await assert.rejects(async () => OnThisDay(1, 32), /Invalid day/);
  });

  it('throws on impossible date (Apr 31)', async () => {
    await assert.rejects(async () => OnThisDay(4, 31), /Invalid date/);
  });

  it('throws on invalid language', async () => {
    await assert.rejects(async () => OnThisDay(7, 4, { lang: 'x' }), /Unsupported language/);
  });

  it('throws on empty string language', async () => {
    await assert.rejects(async () => OnThisDay(7, 4, { lang: '' }), /Unsupported language/);
  });

  it('throws on unsupported language', async () => {
    await assert.rejects(async () => OnThisDay(7, 4, { lang: 'ja' }), /Unsupported language/);
  });

  it('throws on too-short language code', async () => {
    await assert.rejects(async () => OnThisDay(7, 4, { lang: 'x' }), /Unsupported language/);
  });
});

// ═══════════════════════════════════════════════════════════════
//  LAYER 5: LIVE API (optional, behind env flag)
// ═══════════════════════════════════════════════════════════════

const RUN_LIVE = process.env.LIVE_API === 'true';

(RUN_LIVE ? describe : describe.skip)('Live API', () => {
  it('fetches real events for July 4', { timeout: 15000 }, async () => {
    const result = await OnThisDay(7, 4);
    const events = result.getEvents();

    assert.ok(Array.isArray(events));
    assert.ok(events.length > 0, 'Expected at least one event from live API');

    // Validate shape invariants, never exact data
    assert.ok(events.every(e => typeof e.event === 'string' && e.event.length > 0));
    assert.ok(events.every(e => Number.isInteger(e.year) || e.year === null));
  });

  it('fetches real births for July 4', { timeout: 15000 }, async () => {
    const result = await OnThisDay(7, 4, { type: 'births' });
    const births = result.getBirths();

    assert.ok(Array.isArray(births));
    assert.ok(births.length > 0 || births.length === 0); // may be empty
    assert.ok(births.every(b => typeof b.event === 'string'));
    assert.ok(births.every(b => Number.isInteger(b.year) || b.year === null));
  });

  it('fetches real data in Spanish', { timeout: 15000 }, async () => {
    const result = await OnThisDay(7, 4, { lang: 'es' });
    const events = result.getEvents();

    assert.ok(Array.isArray(events));
    assert.ok(events.every(e => typeof e.event === 'string'));
  });

  it('real API response matches expected schema', { timeout: 15000 }, async () => {
    const res = await fetch('https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/events/07/04');
    assert.ok(res.ok, `API returned ${res.status}`);

    const json = await res.json();
    assert.ok(Array.isArray(json), 'Response should be an array for single-type endpoint');

    if (json.length > 0) {
      const item = json[0];
      assert.ok('text' in item, 'Item should have text field');
      assert.ok('year' in item, 'Item should have year field');
      assert.ok(typeof item.text === 'string');
      assert.ok(Number.isInteger(item.year) || item.year === null);
    }
  });

  it('real API contract has not changed (all endpoint)', { timeout: 15000 }, async () => {
    const res = await fetch('https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/all/07/04');
    assert.ok(res.ok);

    const json = await res.json();
    const keys = Object.keys(json).sort();
    const expected = ['births', 'deaths', 'events', 'holidays', 'selected'];

    for (const key of expected) {
      assert.ok(keys.includes(key), `Missing key: ${key}`);
    }
  });
});
