const testLangs = async (langs) => {
  const results = [];
  
  for (const lang of langs) {
    const url = `https://api.wikimedia.org/feed/v1/wikipedia/${lang}/onthisday/births/07/04`;
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) {
        results.push({ lang, ok: false, status: res.status, births: 0 });
        continue;
      }
      const data = await res.json();
      const count = data.births?.length || 0;
      results.push({ lang, ok: true, status: res.status, births: count });
    } catch (e) {
      results.push({ lang, ok: false, status: 'ERR', error: e.name, births: 0 });
    }
  }
  
  // Print summary
  console.table(results);
  const working = results.filter(r => r.ok && r.births > 0).map(r => r.lang);
  console.log(`\nWorking with data: [${working.join(', ')}]`);
  return results;
};

// Test these languages
testLangs([
  'en','es','de','fr','ja','zh','ru','ar','pt','it','nl','pl','sv','tr','ko','hi','he','id','vi','th','fi','no','da','cs','hu','uk','ro','el','bg','sr','hr','sl','lt','lv','et','sk','ca','eu','gl','ast','ta','ml','bn','mr','te','kn','pa','gu','ur','fa','sw','af','sq','am','hy','az','be','ka','kk','mk','mn','ne','si','ta','uz'
]);
