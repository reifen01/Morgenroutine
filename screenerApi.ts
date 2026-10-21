// @ts-nocheck
/**
 * Aktien-Screener (Kriterien nach Jens Rabe) — Server-Teil, fest in der Morgenroutine.
 * Übernommen aus dem früheren Repo reifen01/aktien-screener (api/_lib.js, screen.js, scan.js),
 * Logik unverändert. Yahoo-Daten über das Paket yahoo-finance2 (dynamisch geladen, ESM).
 * Routen: GET /api/screener/screen?t=…  und  GET /api/screener/scan?uni=…
 * Die Seite selbst liegt unter public/screener/index.html.
 */
import type { Express } from "express";

let yfInstanz: any = null;
async function yahoo() {
  if (!yfInstanz) {
    const mod: any = await import("yahoo-finance2");
    const YahooFinance = mod.default || mod;
    yfInstanz = new YahooFinance({ suppressNotices: ["yahooSurvey"] });
  }
  return yfInstanz;
}


const DEFAULT = ['MSFT','GOOGL','NVDA','CAT','CASY','COST','AGCO'];

// Universen (Stand der Zusammensetzung: Mitte/Herbst 2026, ohne Gewähr; S&P 500 aus datasets/s-and-p-500-companies)
const UNIVERSEN = {
  sp100: ['AAPL','ABBV','ABT','ACN','ADBE','AIG','AMD','AMGN','AMT','AMZN','AVGO','AXP','BA','BAC','BK','BKNG','BLK','BMY','BRK-B','C','CAT','CHTR','CL','CMCSA','COF','COP','COST','CRM','CSCO','CVS','CVX','DE','DHR','DIS','DUK','EMR','FDX','GD','GE','GILD','GM','GOOGL','GS','HD','HON','IBM','INTC','INTU','ISRG','JNJ','JPM','KO','LIN','LLY','LMT','LOW','MA','MCD','MDLZ','MDT','MET','META','MMM','MO','MRK','MS','MSFT','NEE','NFLX','NKE','NOW','NVDA','ORCL','PEP','PFE','PG','PLTR','PM','PYPL','QCOM','RTX','SBUX','SCHW','SO','SPG','T','TGT','TMO','TMUS','TSLA','TXN','UNH','UNP','UPS','USB','V','VZ','WFC','WMT','XOM'],
  ndx: ['AAPL','ABNB','ADBE','ADI','ADP','ADSK','AEP','AMAT','AMD','AMGN','AMZN','ANSS','APP','ARM','ASML','AVGO','AXON','AZN','BIIB','BKNG','BKR','CCEP','CDNS','CDW','CEG','CHTR','CMCSA','COST','CPRT','CRWD','CSCO','CSGP','CSX','CTAS','CTSH','DASH','DDOG','DXCM','EA','EXC','FANG','FAST','FTNT','GEHC','GFS','GILD','GOOGL','HON','IDXX','INTC','INTU','ISRG','KDP','KHC','KLAC','LIN','LRCX','LULU','MAR','MCHP','MDLZ','MELI','META','MNST','MRVL','MSFT','MSTR','MU','NFLX','NVDA','NXPI','ODFL','ON','ORLY','PANW','PAYX','PCAR','PDD','PEP','PLTR','PYPL','QCOM','REGN','ROP','ROST','SBUX','SHOP','SNPS','TEAM','TMUS','TSLA','TTD','TTWO','TXN','VRSK','VRTX','WBD','WDAY','XEL','ZS'],
  sp500: [
    'A','AAPL','ABBV','ABNB','ABT','ACGL','ACN','ADBE','ADI','ADM','ADP','ADSK','AEE','AEP','AES','AFL','AIG','AIZ','AJG','AKAM','ALB','ALGN','ALL','ALLE','AMAT',
    'AMCR','AMD','AME','AMGN','AMP','AMT','AMZN','ANET','AON','AOS','APA','APD','APH','APO','APP','APTV','ARE','ARES','ATO','AVGO','AVY','AWK','AXON','AXP','AZO',
    'BA','BAC','BALL','BAX','BBY','BDX','BE','BEN','BF-B','BG','BIIB','BKNG','BKR','BLK','BMY','BNY','BR','BRK-B','BRO','BSX','BX','BXP','C','CAH','CARR',
    'CASY','CAT','CB','CBOE','CBRE','CCI','CCL','CDNS','CDW','CEG','CF','CFG','CHD','CHRW','CHTR','CI','CIEN','CINF','CL','CLX','CMCSA','CME','CMG','CMI','CMS',
    'CNC','CNP','COF','COHR','COIN','COO','COP','COR','COST','CPAY','CPRT','CPT','CRH','CRL','CRM','CRWD','CSCO','CSGP','CSX','CTAS','CTSH','CTVA','CVNA','CVS','CVX',
    'D','DAL','DASH','DD','DDOG','DE','DECK','DELL','DG','DGX','DHI','DHR','DIS','DLR','DLTR','DOC','DOV','DOW','DPZ','DRI','DTE','DUK','DVA','DVN','DXCM',
    'EBAY','ECHO','ECL','ED','EFX','EG','EIX','EL','ELV','EME','EMR','EOG','EQIX','EQT','ERIE','ES','ESS','ETN','ETR','EVRG','EW','EXC','EXE','EXPD','EXPE',
    'EXR','F','FANG','FAST','FCX','FDS','FDX','FDXF','FE','FERG','FFIV','FICO','FIS','FISV','FITB','FIX','FLEX','FOX','FOXA','FRT','FSLR','FTNT','FTV','GD','GDDY',
    'GE','GEHC','GEN','GEV','GILD','GIS','GL','GLW','GM','GNRC','GOOG','GOOGL','GPC','GPN','GRMN','GS','GWW','HAL','HAS','HBAN','HCA','HD','HIG','HII','HLT',
    'HON','HONA','HOOD','HPE','HPQ','HRL','HSIC','HST','HSY','HUBB','HUM','HWM','IBKR','IBM','ICE','IDXX','IEX','IFF','ILMN','INCY','INTC','INTU','INVH','IP','IQV',
    'IR','IRM','ISRG','IT','ITW','IVZ','J','JBHT','JBL','JCI','JKHY','JNJ','JPM','KDP','KEY','KEYS','KHC','KIM','KKR','KLAC','KMB','KMI','KO','KR','KVUE',
    'L','LDOS','LEN','LH','LHX','LII','LIN','LITE','LLY','LMT','LNT','LOW','LRCX','LULU','LUV','LVS','LYB','LYV','MA','MAA','MAR','MAS','MCD','MCHP','MCK',
    'MCO','MDLZ','MDT','MET','META','MGM','MKC','MLM','MMM','MNST','MO','MOS','MPC','MPWR','MRK','MRNA','MRSH','MRVL','MS','MSCI','MSFT','MSI','MTB','MTD','MU',
    'NCLH','NDAQ','NDSN','NEE','NEM','NFLX','NI','NKE','NOC','NOW','NRG','NSC','NTAP','NTRS','NUE','NVDA','NVR','NWS','NWSA','NXPI','O','ODFL','OKE','OMC','ON',
    'ORCL','ORLY','OTIS','OXY','P','PANW','PAYX','PCAR','PCG','PEG','PEP','PFE','PFG','PG','PGR','PH','PHM','PKG','PLD','PLTR','PM','PNC','PNR','PNW','PODD',
    'PPG','PPL','PRU','PSA','PSKY','PSX','PTC','PWR','PYPL','Q','QCOM','RCL','RDDT','REG','REGN','RF','RJF','RL','RMD','ROK','ROL','ROP','ROST','RSG','RTX',
    'RVTY','SBAC','SBUX','SCHW','SHW','SJM','SLB','SMCI','SNA','SNDK','SNPS','SO','SOLV','SPG','SPGI','SRE','STE','STLD','STT','STX','STZ','SW','SWK','SWKS','SYF',
    'SYK','SYY','T','TDG','TDY','TECH','TEL','TER','TFC','TGT','TJX','TKO','TMO','TMUS','TPL','TPR','TRGP','TRMB','TROW','TRV','TSCO','TSLA','TSN','TT','TTWO',
    'TXN','TXT','TYL','UAL','UBER','UDR','UHS','ULTA','UNH','UNP','UPS','URI','USB','V','VEEV','VICI','VLO','VLTO','VMC','VMRK','VRSK','VRSN','VRT','VRTX','VST',
    'VTR','VTRS','VZ','WAB','WAT','WBD','WDAY','WDC','WEC','WELL','WFC','WM','WMB','WMT','WRB','WSM','WST','WTW','WY','WYNN','XEL','XOM','XYL','XYZ','YUM',
    'ZBH','ZBRA','ZTS',
  ],
};
UNIVERSEN.beide = [...new Set([...UNIVERSEN.sp100, ...UNIVERSEN.ndx])];
UNIVERSEN.alle = [...new Set([...UNIVERSEN.sp500, ...UNIVERSEN.ndx])];

// ---------- Hilfen ----------
const pct = (a, b) => (a != null && b) ? (a / b - 1) * 100 : null;
function sma(arr, n) { const v = arr.filter(x => x != null).slice(-n); return v.length === n ? v.reduce((s, x) => s + x, 0) / n : null; }
function ampel(v, g, y, higherIsBetter = true) {
  if (v == null || Number.isNaN(v)) return '⚪';
  if (higherIsBetter) return v >= g ? '🟢' : v >= y ? '🟡' : '🔴';
  return v <= g ? '🟢' : v <= y ? '🟡' : '🔴';
}
const ago = days => new Date(Date.now() - days * 864e5);

async function weeklySeries(sym, weeks = 60) {
  const c = await (await yahoo()).chart(sym, { period1: ago(weeks * 7 + 10), interval: '1wk' });
  const out = [];
  for (const q of (c.quotes || [])) {
    if (q.close == null) continue;
    const x = { d: new Date(q.date).toISOString().slice(0, 10), c: q.close };
    // Yahoo liefert die laufende Woche oft als zusätzlichen Balken → pro Woche nur den letzten Schluss behalten
    if (out.length && (new Date(x.d) - new Date(out[out.length - 1].d)) < 6 * 864e5) out[out.length - 1] = x; else out.push(x);
  }
  return out;
}
async function weeklyCloses(sym, weeks = 60) {
  return (await weeklySeries(sym, weeks)).map(x => x.c);
}

// ---------- Markt-Ampel (Fabians Morgenroutine-Regeln) ----------
async function markt() {
  const [q, spxW] = await Promise.all([
    (await yahoo()).quote(['^VIX', '^VIX3M', '^VVIX', 'CL=F', '^GSPC', '^NDX']),
    weeklyCloses('^GSPC', 30),
  ]);
  const by = Object.fromEntries(q.map(x => [x.symbol, x]));
  const vix = by['^VIX']?.regularMarketPrice, vxv = by['^VIX3M']?.regularMarketPrice;
  const vvix = by['^VVIX']?.regularMarketPrice, wti = by['CL=F']?.regularMarketPrice;
  const spx = by['^GSPC']?.regularMarketPrice, spxMa21 = sma(spxW, 21);
  const ratio = vix && vxv ? vix / vxv : null;
  const rows = [
    { k: 'VIX', h: 'vix', v: vix, text: vix?.toFixed(2), regel: '< 25', a: vix == null ? '⚪' : vix < 20 ? '🟢' : vix < 25 ? '🟡' : '🔴' },
    { k: 'VIX/VXV', h: 'vixvxv', v: ratio, text: ratio ? `${ratio.toFixed(2)} (${vix.toFixed(2)} / ${vxv.toFixed(2)})` : '–', regel: 'Contango < 1,00', a: ratio == null ? '⚪' : ratio < 0.95 ? '🟢' : ratio < 1 ? '🟡' : '🔴' },
    { k: 'VVIX', h: 'vvix', v: vvix, text: vvix?.toFixed(2), regel: '< 100', a: vvix == null ? '⚪' : vvix < 100 ? '🟢' : vvix < 110 ? '🟡' : '🔴' },
    { k: 'WTI Öl', h: 'wti', v: wti, text: wti ? `${wti.toFixed(2)} $` : '–', regel: '< 100 $', a: wti == null ? '⚪' : wti < 90 ? '🟢' : wti < 100 ? '🟡' : '🔴' },
    { k: 'S&P 500 vs. 21-Wo-MA', h: 'spx21', v: pct(spx, spxMa21), text: spxMa21 ? `${spx.toFixed(2)} vs. ${spxMa21.toFixed(2)}` : '–', regel: 'Index über MA (Rabe)', a: spxMa21 == null ? '⚪' : spx > spxMa21 ? '🟢' : '🔴' },
  ];
  const kaufverbot = (vix != null && vix >= 25) || (ratio != null && ratio >= 1) || (vvix != null && vvix >= 130) || (spxMa21 && spx < spxMa21);
  const rot = rows.filter(r => r.a === '🔴').length, gelb = rows.filter(r => r.a === '🟡').length;
  const status = kaufverbot ? '🔴 KAUFVERBOT – nur Bestände verwalten' : rot || gelb > 1 ? '🟡 Vorsicht – reduziertes Risiko (0,5 %)' : '🟢 Neukäufe erlaubt';
  return { rows, status, kaufverbot };
}

// ---------- Einzelaktie ----------
async function one(sym, spyPerf6m) {
  const [q, ws] = await Promise.all([
    (await yahoo()).quoteSummary(sym, { modules: ['price', 'summaryDetail', 'financialData', 'defaultKeyStatistics', 'calendarEvents', 'assetProfile'] }),
    weeklySeries(sym, 60),
  ]);
  const wk = ws.map(x => x.c);
  const p = q.price || {}, s = q.summaryDetail || {}, f = q.financialData || {}, k = q.defaultKeyStatistics || {};
  const price = p.regularMarketPrice;
  const hi = s.fiftyTwoWeekHigh;
  const offHigh = hi ? (1 - price / hi) * 100 : null;
  const ma21w = sma(wk, 21);
  const perf6m = wk.length > 26 ? pct(wk[wk.length - 1], wk[wk.length - 27]) : null;
  const rs = perf6m != null && spyPerf6m != null ? perf6m - spyPerf6m : null;
  const ocf = f.operatingCashflow ?? null, fcf = f.freeCashflow ?? null;
  const opm = f.operatingMargins != null ? f.operatingMargins * 100 : null;
  const de = f.debtToEquity ?? null;
  const revG = f.revenueGrowth != null ? f.revenueGrowth * 100 : null;
  const divY = s.dividendYield != null ? s.dividendYield * 100 : 0;
  const pe = s.forwardPE ?? k.forwardPE ?? null, peT = s.trailingPE ?? null;
  const ed = q.calendarEvents?.earnings?.earningsDate?.[0];
  const earnDate = ed ? new Date(ed) : null;
  const daysToEarn = earnDate ? Math.round((earnDate - Date.now()) / 864e5) : null;
  const ma50 = s.fiftyDayAverage, ma200 = s.twoHundredDayAverage;
  const ap = q.assetProfile || {};
  const profil = { sector: ap.sector || null, industry: ap.industry || null, mitarbeiter: ap.fullTimeEmployees ?? null,
    web: ap.website || null, land: ap.country || null, ort: ap.city || null,
    summary: ap.longBusinessSummary ? ap.longBusinessSummary.slice(0, 1500) : null };

  // Rabe-Kriterien (Original-Kursunterlagen) + Fabians System
  const crit = {
    trend21w: { label: 'Über 21-Wochen-MA (Rabe)', text: ma21w ? `${pct(price, ma21w) >= 0 ? '+' : ''}${pct(price, ma21w).toFixed(1)} % vs. ${ma21w.toFixed(2)}` : '–', a: ma21w == null ? '⚪' : price > ma21w ? '🟢' : '🔴' },
    hoch:     { label: 'Nähe 52W-/Allzeithoch (Rabe)', text: offHigh == null ? '–' : `${offHigh.toFixed(1)} % unter Hoch`, a: ampel(offHigh, 5, 15, false) },
    rs:       { label: 'Rel. Stärke vs. S&P 6M (Rabe)', text: rs == null ? '–' : `${rs >= 0 ? '+' : ''}${rs.toFixed(1)} %-Pkt. (${perf6m.toFixed(1)} % vs. ${spyPerf6m.toFixed(1)} %)`, a: rs == null ? '⚪' : rs > 0 ? '🟢' : rs > -10 ? '🟡' : '🔴' },
    cashflow: { label: 'Stabiler op. Cashflow (CSP)', text: ocf == null ? '–' : `${(ocf / 1e9).toFixed(1)} Mrd op. / ${fcf == null ? '–' : (fcf / 1e9).toFixed(1)} Mrd frei`, a: ocf == null ? '⚪' : ocf > 0 && (fcf ?? 1) > 0 ? '🟢' : ocf > 0 ? '🟡' : '🔴' },
    marge:    { label: 'Op. Marge (Qualität)', text: opm == null ? '–' : `${opm.toFixed(1)} %`, a: ampel(opm, 20, 10) },
    schulden: { label: 'Schulden/EK (Qualität)', text: de == null ? '–' : `${de.toFixed(0)} %`, a: ampel(de, 50, 100, false) },
    dividende:{ label: 'Dividende (CSP)', text: `${divY.toFixed(2)} %`, a: divY > 0 ? '🟢' : '🟡' },
    earnings: { label: 'Earnings-Abstand (Rabe)', text: earnDate ? `${earnDate.toLocaleDateString('de-AT')} (${daysToEarn} Tage)` : '–', a: daysToEarn == null ? '⚪' : daysToEarn < 0 ? '🟢' : daysToEarn <= 14 ? '🔴' : daysToEarn <= 30 ? '🟡' : '🟢' },
  };
  const score = Object.values(crit).filter(c => c.a === '🟢').length;
  const rot = Object.values(crit).filter(c => c.a === '🔴').length;
  const stark = crit.trend21w.a === '🟢' && crit.hoch.a !== '🔴' && crit.rs.a === '🟢';
  const qualitaet = crit.cashflow.a === '🟢' && crit.marge.a !== '🔴' && crit.schulden.a !== '🔴';
  let modus = 'Beobachten';
  if (stark && qualitaet && crit.earnings.a !== '🔴') modus = 'Rabe-Setup: Stärke + Qualität';
  else if (stark && crit.earnings.a === '🔴') modus = 'Stark – aber Earnings abwarten';
  else if (stark) modus = 'Trade: Stärke (SPS-Logik)';
  else if (qualitaet && offHigh != null && offHigh >= 20) modus = 'Investment: Rücksetzer prüfen (CSP)';
  else if (crit.trend21w.a === '🔴') modus = 'Kein Trend – Rabe: nicht kaufen';

  return { sym, name: p.shortName || p.longName || sym, price, currency: p.currency, change: (p.regularMarketChangePercent ?? 0) * 100,
    pe, peT, revG, opm, de, offHigh, daysToEarn, beta: k.beta ?? null, mcap: p.marketCap ?? null, hi, ma50, ma200, ma21w, crit, score, rot, modus, profil,
    rs, perf6m, earnDate: earnDate ? earnDate.toISOString() : null,
    hist: ws.map(x => [x.d, Math.round(x.c * 100) / 100]) };  // Wochenschlüsse für Verlauf/Auswertung
}

// ---------- Routen ----------

const num = (v, d) => { const n = parseFloat(v); return Number.isFinite(n) ? n : d; };
const flag = (v, d) => v == null || v === '' ? d : v === '1' || v === 'true';


async function screenHandler(req, res) {
  const raw = (req.query.t || '').toString().trim();
  const syms = (raw ? raw.split(/[,\s]+/) : DEFAULT).map(s => s.toUpperCase()).filter(Boolean).slice(0, 25);
  const [m, spyW] = await Promise.all([markt().catch(e => ({ error: e.message })), weeklyCloses('SPY', 60).catch(() => [])]);
  const spyPerf6m = spyW.length > 26 ? pct(spyW[spyW.length - 1], spyW[spyW.length - 27]) : null;
  const rows = await Promise.all(syms.map(s => one(s, spyPerf6m).catch(e => ({ sym: s, error: e.message?.slice(0, 120) || 'Fehler' }))));
  rows.sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || (a.rot ?? 9) - (b.rot ?? 9));
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.status(200).json({ asOf: new Date().toISOString(), markt: m, rows });
}

async function scanHandler(req, res) {
  const yfi = await yahoo();
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
    Promise.all(chunks.map(c => yfi.quote(c).catch(() => []))),
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

export function registerScreenerRoutes(app: Express) {
  const cache = (_req, res, next) => { res.setHeader("Cache-Control", "s-maxage=900, stale-while-revalidate=3600"); next(); };
  const sicher = (fn) => async (req, res) => {
    try { await fn(req, res); }
    catch (e) { res.status(500).json({ error: e?.message || "Screener-Fehler" }); }
  };
  app.get("/api/screener/screen", cache, sicher(screenHandler));
  app.get("/api/screener/scan", cache, sicher(scanHandler));
}
