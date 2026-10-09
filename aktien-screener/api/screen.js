import { DEFAULT, markt, one, weeklyCloses, pct } from './_lib.js';

export default async function handler(req, res) {
  const raw = (req.query.t || '').toString().trim();
  const syms = (raw ? raw.split(/[,\s]+/) : DEFAULT).map(s => s.toUpperCase()).filter(Boolean).slice(0, 25);
  const [m, spyW] = await Promise.all([markt().catch(e => ({ error: e.message })), weeklyCloses('SPY', 60).catch(() => [])]);
  const spyPerf6m = spyW.length > 26 ? pct(spyW[spyW.length - 1], spyW[spyW.length - 27]) : null;
  const rows = await Promise.all(syms.map(s => one(s, spyPerf6m).catch(e => ({ sym: s, error: e.message?.slice(0, 120) || 'Fehler' }))));
  rows.sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || (a.rot ?? 9) - (b.rot ?? 9));
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(200).json({ asOf: new Date().toISOString(), markt: m, rows });
}
