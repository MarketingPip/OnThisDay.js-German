import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import {
  isLeapYear,
  getDaysInMonth,
  normalizeItem,
  normalize,
  packageRaw,
  OnThisDay
} from './OnThisDay.js';

// ── Mock Helpers ──────────────────────────────────────────────

function mockFetch(response) {
  global.fetch = typeof response === 'function'
    ? response
    : async () => ({ ok: true, status: 200, statusText: 'OK', json: async () => response });
}

function mockFetchError(status, statusText) {
  global.fetch = async () => ({ ok: false, status, statusText });
}

// ── normalizeItem() ───────────────────────────────────────────

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

// ── normalize() ───────────────────────────────────────────────

describe('normalize()', () => {
  it('normalizes "all" type response with full shape', () => {
    const data = {
      events:   [{ year: 2000, text: 'Event' }],
      births:   [{ year: 1990, text: 'Birth' }],
      deaths:   [{ year: 1980, text: 'Death' }],
      holidays: [{ year: null, text: 'Holiday' }],
      selected: [{ year: 1970, text: 'Selected' }]
    };
    const result = normalize(data, 'all');

    assert.deepStrictEqual(result.events[0],   { year: 2000, event: 'Event' });
    assert.deepStrictEqual(result.births[0],   { year: 1990, event: 'Birth' });
    assert.deepStrictEqual(result.deaths[0],   { year: 1980, event: 'Death' });
    assert.deepStrictEqual(result.holidays[0], { year: null, event: 'Holiday' });
    assert.deepStrictEqual(result.selected[0], { year: 1970, event: 'Selected' });
  });

  it('normalizes single-type response (array)', () => {
    const result = normalize([{ year: 2000, text: 'Event' }], 'events');
    assert.deepStrictEqual(result.events, [{ year: 2000, event: 'Event' }]);
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
    const data = {
      events: [
        { year: 2000, text: 'Valid' },
        null,
        { year: 2001 },
        { text: 'No year' },
        'not an object',
        42
      ]
    };
    const result = normalize(data, 'all');
    assert.strictEqual(result.events.length, 6);
    assert.deepStrictEqual(result.events[0], { year: 2000, event: 'Valid' });
    assert.deepStrictEqual(result.events[1], { year: null, event: '' });
    assert.deepStrictEqual(result.events[2], { year: 2001, event: '' });
    assert.deepStrictEqual(result.events[3], { year: null, event: 'No year' });
    assert.deepStrictEqual(result.events[4], { year: null, event: '' });
    assert.deepStrictEqual(result.events[5], { year: null, event: '' });
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

// ── packageRaw() ────────────────────────────────────────────

describe('packageRaw()', () => {
  it('packages "all" type response', () => {
    const result = packageRaw({ events: [1, 2], births: [3] }, 'all');
    assert.deepStrictEqual(result.events, [1, 2]);
    assert.deepStrictEqual(result.births, [3]);
    assert.deepStrictEqual(result.deaths, []);
    assert.deepStrictEqual(result.holidays, []);
    assert.deepStrictEqual(result.selected, []);
  });

  it('packages single-type response', () => {
    const result = packageRaw([1, 2, 3], 'events');
    assert.deepStrictEqual(result.events, [1, 2, 3]);
    assert.deepStrictEqual(result.births, []);
  });

  it('handles null data', () => {
    const result = packageRaw(null, 'all');
    assert.deepStrictEqual(result.events, []);
    assert.deepStrictEqual(result.births, []);
  });
});

// ── isLeapYear() / getDaysInMonth() ─────────────────────────

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
    assert.strictEqual(getDaysInMonth(2, 2024), 29); // leap year
    assert.strictEqual(getDaysInMonth(4, 2024), 30);
    assert.strictEqual(getDaysInMonth(12, 2024), 31);
  });
});

// ── resolveArgs via OnThisDay() ─────────────────────────────

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

  // ── Boundary dates ──
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

  // ── Invalid inputs ──
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
    await assert.rejects(async () => OnThisDay(7, 4, { lang: 'x' }), /Invalid language code/);
  });

  it('throws on empty string language', async () => {
    await assert.rejects(async () => OnThisDay(7, 4, { lang: '' }), /Invalid language code/);
  });
});

// ── OnThisDay() integration ─────────────────────────────────

describe('OnThisDay() integration', () => {
  let originalFetch;

  before(() => {
    originalFetch = global.fetch;
  });

  after(() => {
    global.fetch = originalFetch;
  });

  it('fetches all data with full snapshot shape', async () => {
    mockFetch({
      events:   [{ year: 1776, text: 'Independence declared' }],
      births:   [{ year: 1990, text: 'Someone born' }],
      deaths:   [{ year: 1826, text: 'Jefferson died' }],
      holidays: [{ year: null, text: 'Independence Day' }],
      selected: [{ year: 1776, text: 'Selected event' }]
    });

    const result = await OnThisDay(7, 4);

    assert.deepStrictEqual(result.getAll(), {
      events:   [{ year: 1776, event: 'Independence declared' }],
      births:   [{ year: 1990, event: 'Someone born' }],
      deaths:   [{ year: 1826, event: 'Jefferson died' }],
      holidays: [{ year: null, event: 'Independence Day' }],
      selected: [{ year: 1776, event: 'Selected event' }]
    });

    assert.deepStrictEqual(result.getEvents(),   [{ year: 1776, event: 'Independence declared' }]);
    assert.deepStrictEqual(result.getBirths(),   [{ year: 1990, event: 'Someone born' }]);
    assert.deepStrictEqual(result.getDeaths(),   [{ year: 1826, event: 'Jefferson died' }]);
    assert.deepStrictEqual(result.getHolidays(), [{ year: null, event: 'Independence Day' }]);
    assert.deepStrictEqual(result.getSelected(), [{ year: 1776, event: 'Selected event' }]);
  });

  it('fetches events only', async () => {
    mockFetch([{ year: 2000, text: 'Y2K' }]);

    const result = await OnThisDay(7, 4, { type: 'events' });
    assert.deepStrictEqual(result.getEvents(), [{ year: 2000, event: 'Y2K' }]);
    assert.deepStrictEqual(result.getBirths(), []);
    assert.deepStrictEqual(result.getDeaths(), []);
    assert.deepStrictEqual(result.getHolidays(), []);
    assert.deepStrictEqual(result.getSelected(), []);
  });

  it('fetches births only', async () => {
    mockFetch([{ year: 1995, text: 'Birth' }]);

    const result = await OnThisDay(7, 4, { type: 'births' });
    assert.deepStrictEqual(result.getBirths(), [{ year: 1995, event: 'Birth' }]);
    assert.deepStrictEqual(result.getEvents(), []);
  });

  it('fetches selected only', async () => {
    mockFetch([{ year: 1980, text: 'Selected' }]);

    const result = await OnThisDay(7, 4, { type: 'selected' });
    assert.deepStrictEqual(result.getSelected(), [{ year: 1980, event: 'Selected' }]);
    assert.deepStrictEqual(result.getEvents(), []);
  });

  it('works with different languages and asserts URL', async () => {
    let calledUrl;
    mockFetch((url) => {
      calledUrl = url;
      return { ok: true, status: 200, statusText: 'OK', json: async () => [{ year: 1800, text: 'German event' }] };
    });

    const result = await OnThisDay(7, 4, { lang: 'de', type: 'events' });
    assert.ok(Array.isArray(result.getEvents()));
    assert.ok(calledUrl.includes('/de/'));
    assert.ok(calledUrl.includes('/events/'));
    assert.ok(calledUrl.includes('/07/04'));
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
    mockFetch(async () => ({ ok: true, status: 200, statusText: 'OK', json: async () => { throw new Error('Unexpected token'); } }));

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
    mockFetch([{ year: 2000, text: 'Event' }]);

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
      return { ok: true, status: 200, json: async () => [] };
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
      events: Array.from({ length: 1000 }, (_, i) => ({ year: 1000 + i, text: `Event ${i}` }))
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
