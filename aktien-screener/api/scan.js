import { yf, UNIVERSEN, one, weeklyCloses, pct } from './_lib.js';

const num = (v, d) => { const n = parseFloat(v); return Number.isFinite(n) ? n : d; };
const flag = (v, d) => v == null || v === '' ? d : v === '1' || v === 'true';

export default async function handler(req, res) {
  const q = req.query;
  const f = {
    uni: UNIVERSEN[q.uni] ? q.uni : 'sp100',
    maxOff: num(q.maxOff, 15),        // max. % unter 52W-Hoch
    ma21: flag(q.ma21, true),         // über 21-Wochen-MA Pflicht
    rs: flag(q.rs, false),            // relative Stärke vs. SPY Pflicht
    minMarge: num(q.minMarge, 0),     // min. op. Marge %
    maxDE: num(q.maxDE, 9999),        // max. Schulden/EK %
    div: flag(q.div, false),          // Dividende Pflicht
    minEarn: num(q.minEarn, 0),       // min. Tage bis Earnings
    minMcap: num(q.minMcap, 0),       // Mrd USD
    limit: Math.max(10, Math.min(num(q.pre ?? q.limit, 20), 60)),  // Vorauswahl-Größe
  };
  const universe = UNIVERSEN[f.uni];

  // Stufe 1: ein Batch-Quote für das ganze Universum (billig)
  const chunks = [];
  for (let i = 0; i < universe.length; i += 100) chunks.push(universe.slice(i, i + 100));
  const [parts, spyW] = await Promise.all([
    Promise.all(chunks.map(c => yf.quote(c).catch(() => []))),
    weeklyCloses('SPY', 60).catch(() => []),
  ]);
  const quotes = parts.flat().filter(x => x && x.symbol);
  const spyPerf6m = spyW.length > 26 ? pct(spyW[spyW.length - 1], spyW[spyW.length - 27]) : null;
  const vor = quotes.map(x => {
    const off = x.fiftyTwoWeekHigh ? (1 - x.regularMarketPrice / x.fiftyTwoWeekHigh) * 100 : null;
    const earnDays = x.earningsTimestamp ? Math.round((new Date(x.earningsTimestamp) - Date.now()) / 864e5) : null;
    return { sym: x.symbol, off, earnDays, mcap: x.marketCap, ma200: x.twoHundredDayAverage, price: x.regularMarketPrice, div: x.dividendYield };
  }).filter(x => x.off != null && x.off <= f.maxOff)
    .filter(x => !f.ma21 || (x.ma200 && x.price > x.ma200))               // grober Vorfilter, exakt in Stufe 2
    .filter(x => !f.div || (x.div ?? 0) > 0)
    .filter(x => (x.mcap ?? 0) / 1e9 >= f.minMcap)
    .filter(x => f.minEarn <= 0 || x.earnDays == null || x.earnDays < 0 || x.earnDays >= f.minEarn)
    .sort((a, b) => a.off - b.off)
    .slice(0, f.limit);

  // Stufe 2: Vollanalyse der Vorauswahl
  const voll = [];
  for (let i = 0; i < vor.length; i += 15) {   // in Paketen, damit Yahoo nicht drosselt
    voll.push(...await Promise.all(vor.slice(i, i + 15).map(v => one(v.sym, spyPerf6m).catch(e => ({ sym: v.sym, error: e.message?.slice(0, 100) })))));
  }
  voll.forEach(r => { delete r.hist; });   // Wochenverlauf nur in der Watchlist nötig
  const rows = voll.filter(r => !r.error)
    .filter(r => !f.ma21 || r.crit.trend21w.a === '🟢')
    .filter(r => !f.rs || r.crit.rs.a === '🟢')
    .filter(r => f.minMarge <= 0 || (r.opm ?? -1) >= f.minMarge)
    .filter(r => f.maxDE >= 9999 || r.de == null || r.de <= f.maxDE);
  rows.sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || (a.rot ?? 9) - (b.rot ?? 9));
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(200).json({ asOf: new Date().toISOString(), filter: f, universum: universe.length, vorauswahl: vor.length, rows });
}
