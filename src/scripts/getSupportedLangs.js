// test-languages.js
// Run this locally to discover which languages support all event types
// Usage: node test-languages.js

const testLangs = async (langs) => {
  const results = [];
  const TYPES = ['events', 'births', 'deaths', 'holidays', 'selected'];

  for (const lang of langs) {
    const langResult = { lang, ok: false, status: null, types: {} };

    try {
      const res = await fetch(
        `https://api.wikimedia.org/feed/v1/wikipedia/${lang}/onthisday/all/07/04`,
        { signal: AbortSignal.timeout(8000) }
      );

      langResult.status = res.status;

      if (!res.ok) {
        results.push(langResult);
        continue;
      }

      const data = await res.json();
      langResult.ok = true;

      for (const type of TYPES) {
        const arr = data[type];
        langResult.types[type] = {
          present: Array.isArray(arr),
          count: Array.isArray(arr) ? arr.length : 0,
          hasData: Array.isArray(arr) && arr.length > 0
        };
      }

      // Check schema of first event if available
      if (Array.isArray(data.events) && data.events.length > 0) {
        const first = data.events[0];
        langResult.schema = {
          hasText: 'text' in first,
          hasYear: 'year' in first,
          hasPages: 'pages' in first
        };
      }
    } catch (e) {
      langResult.status = 'ERR';
      langResult.error = e.name;
    }

    results.push(langResult);
  }

  // Print detailed results
  console.log('='.repeat(80));
  console.log('LANGUAGE SUPPORT REPORT');
  console.log('='.repeat(80));

  for (const r of results) {
    const typeSummary = Object.entries(r.types)
      .map(([t, info]) => `${t}:${info.count}`)
      .join(' | ');

    const status = r.ok ? 'OK' : 'FAIL';
    console.log(`[${status}] ${r.lang.padEnd(6)} HTTP:${r.status}  ${typeSummary}`);
  }

  // Summary tables
  console.log('\n' + '='.repeat(80));
  console.log('FULLY WORKING (all types present + events has data):');
  console.log('='.repeat(80));

  const fullyWorking = results.filter(r => {
    if (!r.ok) return false;
    return Object.values(r.types).every(t => t.present) && r.types.events.hasData;
  });

  for (const r of fullyWorking) {
    console.log(`  OK ${r.lang}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('PARTIAL (API OK but missing some types):');
  console.log('='.repeat(80));

  const partial = results.filter(r => {
    if (!r.ok) return false;
    return !Object.values(r.types).every(t => t.present);
  });

  for (const r of partial) {
    const missing = Object.entries(r.types)
      .filter(([_, info]) => !info.present)
      .map(([t, _]) => t)
      .join(', ');
    console.log(`  WARN ${r.lang} -- missing: ${missing}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('BROKEN (HTTP error or exception):');
  console.log('='.repeat(80));

  const broken = results.filter(r => !r.ok);
  for (const r of broken) {
    console.log(`  FAIL ${r.lang} -- ${r.status}${r.error ? ' (' + r.error + ')' : ''}`);
  }

  console.log('\n' + '='.repeat(80));
  console.log('RECOMMENDED SUPPORTED_LANGS:');
  console.log('='.repeat(80));
  const recommended = fullyWorking.map(r => `'${r.lang}'`).join(', ');
  console.log(`[${recommended}]`);

  return results;
};

// Test these languages
testLangs([
  'en','es','de','fr','ja','zh','ru','ar','pt','it','nl','pl','sv','tr','ko','hi','he','id','vi','th','fi','no','da','cs','hu','uk','ro','el','bg','sr','hr','sl','lt','lv','et','sk','ca','eu','gl','ast','ta','ml','bn','mr','te','kn','pa','gu','ur','fa','sw','af','sq','am','hy','az','be','ka','kk','mk','mn','ne','si','uz'
]);
