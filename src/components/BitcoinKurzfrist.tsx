/**
 * BITCOIN-KURZFRIST — Karte in der Morgenroutine.
 * -------------------------------------------------
 * Zwei Watchlist-Zeilen im Stil der Blasen-Ampel:
 *   Hebel  Ist der Perp-Markt überladen? (Funding, Open Interest, Long-Quote von OKX)
 *   Zone   Wo steht der Kurs im Power-Law-Kanal? (Yahoo-Tagesschluss, Mayer, Fear & Greed)
 * Antippen klappt Verlauf, Schwellen und Hilfe auf.
 *
 * Daten: /api/bitcoin-kurzfrist (Server-Cache 30 min), im Browser zusätzlich
 * 30 min in localStorage. Die Regel selbst steht NUR in utils/bitcoinKurzfrist.ts.
 *
 * Die Zeilen steuern Nachkauf-Tempo und Stopps beim Power-Law-Hold — sie sperren nichts.
 */
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, HelpCircle, Info, Loader2, RefreshCw } from "lucide-react";
import HilfeLink from "./HilfeLink";
import { TrendArrow } from "./TrendBarometer";
import {
  BITCOIN_QUELLEN, BITCOIN_RANG, BitcoinRohdaten, BitcoinZustand, HEBEL_REGEL, ZONE_REGEL,
  berechneHebel, berechneZone, bitcoinTrend,
} from "../utils/bitcoinKurzfrist";

const CACHE_KEY = "morgenroutine_bitcoin_kurzfrist";
const CACHE_TTL = 30 * 60 * 1000;

type Farbe = BitcoinZustand | "grau";
const PUNKT: Record<Farbe, string> = { GRUEN: "bg-emerald-500", GELB: "bg-amber-400", ROT: "bg-rose-500 animate-pulse", grau: "bg-slate-300 animate-pulse" };
const TEXT: Record<Farbe, string> = { GRUEN: "text-emerald-700", GELB: "text-amber-700", ROT: "text-rose-600", grau: "text-slate-500" };
const BAND: Record<BitcoinZustand, string> = { GRUEN: "bg-emerald-500", GELB: "bg-amber-400", ROT: "bg-rose-500" };
const NAME: Record<BitcoinZustand, string> = { GRUEN: "Grün", GELB: "Gelb", ROT: "Rot" };
const HEBEL_STATUS: Record<BitcoinZustand, string> = { GRUEN: "Ruhig", GELB: "Gedrängt", ROT: "Heiß" };
const ZONE_STATUS: Record<BitcoinZustand, string> = { GRUEN: "Unter Fit", GELB: "Über Fit", ROT: "Blase" };
const TREND_HINT = { good: "Ampel hat sich verbessert", flat: "Ampel unverändert", bad: "Ampel hat sich verschlechtert", none: "Zu wenig Historie" } as const;

const de = (v: number, nk = 0) => v.toLocaleString("de-DE", { minimumFractionDigits: nk, maximumFractionDigits: nk });
const fmtPct = (v: number | null, nk = 0, vz = true) =>
  v === null || !isFinite(v) ? "—" : `${vz && v > 0 ? "+" : v < 0 ? "−" : ""}${de(Math.abs(v * 100), nk)} %`;
const fmtFunding = (v: number | null) => (v === null || !isFinite(v) ? "—" : `${v < 0 ? "−" : ""}${de(Math.abs(v * 100), 4)} %`);
const fmtUsd = (v: number | null) => (v === null || !isFinite(v) ? "—" : `${de(v)} USD`);
const fmtMrd = (v: number | null) => (v === null || !isFinite(v) ? "—" : `${de(v / 1e9, 2)} Mrd`);
const fmtMonat = (m: string | null) => (m ? `${m.slice(5, 7)}/${m.slice(0, 4)}` : "—");
const fmtTag = (d: string | null) => (d ? `${d.slice(8, 10)}.${d.slice(5, 7)}.` : "—");

export default function BitcoinKurzfrist() {
  const [daten, setDaten] = useState<BitcoinRohdaten | null>(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const c = JSON.parse(raw) as { ts: number; data: BitcoinRohdaten };
      return c?.data?.generatedAt ? c.data : null;
    } catch { return null; }
  });
  const [laden, setLaden] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [offen, setOffen] = useState<Set<string>>(new Set());
  const [helpId, setHelpId] = useState<string | null>(null);

  const laden_ = async (erzwingen = false) => {
    try {
      if (!erzwingen) {
        const raw = localStorage.getItem(CACHE_KEY);
        if (raw) {
          const c = JSON.parse(raw) as { ts: number; data: BitcoinRohdaten };
          if (c?.ts && Date.now() - c.ts < CACHE_TTL && c.data?.generatedAt) { setDaten(c.data); return; }
        }
      }
    } catch { /* Cache kaputt → neu laden */ }
    setLaden(true); setFehler(null);
    try {
      const r = await fetch("/api/bitcoin-kurzfrist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ perp: BITCOIN_QUELLEN.perp, kurs: BITCOIN_QUELLEN.kurs, range: BITCOIN_QUELLEN.kursRange }),
      });
      const d = await r.json();
      if (!r.ok || !d?.generatedAt) throw new Error(d?.error || `HTTP ${r.status}`);
      setDaten(d);
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: d })); } catch { /* voll */ }
    } catch (e: any) {
      setFehler(e?.message || "Bitcoin-Daten konnten nicht geladen werden.");
    } finally {
      setLaden(false);
    }
  };
  useEffect(() => { laden_(); }, []);

  const hebel = useMemo(() => (daten && daten.hebelTage.length > 0 ? berechneHebel(daten) : null), [daten]);
  const zone = useMemo(() => (daten && Object.keys(daten.kurse).length > 0 ? berechneZone(daten) : null), [daten]);

  // Zeilen: Rot oben, dann Gelb, dann Grün; bei Gleichstand Hebel vor Zone.
  const zeilen = useMemo(() => {
    const liste: { id: "hebel" | "zone"; zustand: BitcoinZustand | null; reihe: number }[] = [
      { id: "hebel", zustand: hebel?.zustand ?? null, reihe: 0 },
      { id: "zone", zustand: zone?.zustand ?? null, reihe: 1 },
    ];
    const rang = (z: BitcoinZustand | null) => (z ? BITCOIN_RANG[z] : -1);
    return liste.sort((a, b) => rang(b.zustand) - rang(a.zustand) || a.reihe - b.reihe);
  }, [hebel, zone]);

  const ids = zeilen.map((z) => z.id);
  const alleOffen = ids.every((id) => offen.has(id));
  const toggle = (id: string) => setOffen((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleHelp = (id: string) => setHelpId((h) => (h === id ? null : id));

  const anzahl: Record<BitcoinZustand, number> = { GRUEN: 0, GELB: 0, ROT: 0 };
  zeilen.forEach((z) => { if (z.zustand) anzahl[z.zustand]++; });
  const quellenFehler = daten?.fehler ? Object.entries(daten.fehler) : [];

  // Hebel: "seit" = erster Tag des aktuellen Zustands im 30-Tage-Verlauf.
  const hebelSeit = useMemo(() => {
    if (!hebel) return null;
    let seit: string | null = null;
    for (let i = hebel.verlauf.length - 1; i >= 0; i--) {
      if (hebel.verlauf[i].zustand !== hebel.zustand) break;
      seit = hebel.verlauf[i].datum;
    }
    return seit;
  }, [hebel]);

  const schwellen = (id: "hebel" | "zone") => id === "hebel" ? (
    <>
      <span className="text-emerald-700">&lt;{de(HEBEL_REGEL.fundingGelb * 100, 2)} %</span><span className="text-slate-300">|</span>
      <span className="text-amber-600">≥{de(HEBEL_REGEL.fundingGelb * 100, 2)} %</span><span className="text-slate-300">|</span>
      <span className="text-rose-600">≥{de(HEBEL_REGEL.fundingRot * 100, 2)} % / 8h</span>
    </>
  ) : (
    <>
      <span className="text-emerald-700">&lt;1× Fit</span><span className="text-slate-300">|</span>
      <span className="text-amber-600">1–{ZONE_REGEL.kanal}×</span><span className="text-slate-300">|</span>
      <span className="text-rose-600">≥{ZONE_REGEL.kanal}× Fit</span>
    </>
  );

  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-3.5 sm:p-8 space-y-6 shadow-md shadow-slate-200/20">
      <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
        <span className="w-1.5 h-4 rounded bg-slate-800 block"></span>
        ₿ Bitcoin-Kurzfrist
        <HilfeLink abschnitt="bitcoin-kurzfrist" titel="Bitcoin-Kurzfrist im Handbuch nachlesen" />
      </h3>

      {(hebel || zone) && (
        <div className="flex flex-wrap gap-1.5">
          {(["ROT", "GELB", "GRUEN"] as BitcoinZustand[]).map((z) => (
            <span key={z} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-50 border border-slate-200 text-slate-700">
              <span className={`w-2 h-2 rounded-full ${BAND[z]}`}></span>{anzahl[z]} {NAME[z]}
            </span>
          ))}
          {zone?.kurs && <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-50 border border-slate-200 text-slate-700">₿ {fmtUsd(zone.kurs)}</span>}
          {zone?.fng && <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-50 border border-slate-200 text-slate-700">F&amp;G {zone.fng.wert} · {zone.fng.text}</span>}
        </div>
      )}

      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1 gap-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hebel &amp; Zone</span>
          <span className="inline-flex items-center gap-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            <button
              type="button"
              onClick={() => setOffen(alleOffen ? new Set() : new Set(ids))}
              className="inline-flex items-center gap-1 px-2 h-6 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 text-[10px] font-bold uppercase tracking-wide cursor-pointer"
              title={alleOffen ? "Alle Zeilen zuklappen" : "Alle Zeilen aufklappen"}
            >
              {alleOffen ? <><ChevronUp className="h-3.5 w-3.5" /> Alle zu</> : <><ChevronDown className="h-3.5 w-3.5" /> Alle auf</>}
            </button>
            Ampel
            <button
              type="button"
              onClick={() => toggleHelp("ampel")}
              className="inline-flex items-center justify-center w-4 h-4 rounded-full text-emerald-600 hover:text-emerald-800 hover:bg-emerald-100/80 bg-emerald-50 border border-emerald-100/60 transition-all cursor-pointer"
              title="Was bedeuten die Farben?"
            >
              <HelpCircle className="h-3 w-3" />
            </button>
          </span>
        </div>

        {helpId === "ampel" && (
          <div className="p-4 text-xs text-slate-650 leading-relaxed font-semibold rounded-xl border-l-4 border-emerald-500 bg-emerald-500/5 space-y-3">
            <div>
              <strong className="text-slate-900">Bitcoin-Kurzfrist — zwei Zeilen, zwei Fragen</strong><br />
              Die Blasen-Ampel sieht Bitcoin nur monatlich. Hier geht es um die Wochen davor. <strong>Hebel</strong> fragt, ob der Markt für ewige Futures (Perps) überladen ist — überladene Longs sind der Treibstoff für Flash-Crashs wie am 10.10.2025 oder am 17./18.10.2026. <strong>Zone</strong> fragt, wo der Kurs im Power-Law-Kanal liegt — das sagt, ob ein Rücksetzer Kaufzone oder Blasenkorrektur ist.
            </div>
            <ul className="list-disc pl-4 space-y-1 font-bold">
              <li><span className="text-emerald-700">Grün.</span> Hebel: Funding unter {de(HEBEL_REGEL.fundingGelb * 100, 2)} %/8h, Open Interest ruhig, Long-Konten unter {de(HEBEL_REGEL.longQuote * 100)} %. Zone: Kurs unter dem Power-Law-Fit; unter 0,5× Fit beginnt die Kaufzone.</li>
              <li><span className="text-amber-700">Gelb.</span> Hebel: ein Warnsignal (Funding ≥ {de(HEBEL_REGEL.fundingGelb * 100, 2)} %, Open Interest +{de(HEBEL_REGEL.oiSprung * 100)} % in 24 h oder ≥ {de(HEBEL_REGEL.longQuote * 100)} % Long-Konten). Zone: Kurs über dem Fit, aber unter dem {ZONE_REGEL.kanal}-fachen — normaler Bullenmarkt.</li>
              <li><span className="text-rose-700">Rot.</span> Hebel: Funding ≥ {de(HEBEL_REGEL.fundingRot * 100, 2)} %/8h oder OI-Sprung plus erhöhtes Funding. Zone: Kurs über dem {ZONE_REGEL.kanal}-fachen Fit — so weit oben war Bitcoin nur 2017/18 und 2021, jedes Mal vor einem Minus von 70–80 %.</li>
            </ul>
            <div className="p-2.5 bg-white/70 rounded-xl border border-emerald-100 text-[11px] font-semibold text-slate-800">
              <strong>Kein Timing-Werkzeug.</strong> Kurzfristig ist Bitcoin laut den Studien fast reines Rauschen. Die Zeilen sagen nicht, wann es dreht, sondern wie groß ein Rutsch werden kann (Hebel) und ob er eine Gelegenheit ist (Zone). Sie steuern nur Nachkauf-Tempo und Stopps beim langfristigen Halten — die Kaufsperre kommt ausschließlich aus den Kaufschranken.
            </div>
            <div className="text-[11px] text-slate-500">
              Quellen: Perp-Daten von OKX (Funding, Open Interest, Long/Short-Konten), Fear &amp; Greed von alternative.me, Kurs von Yahoo. Power-Law nach arXiv 2605.21316 (α = {de(ZONE_REGEL.alpha, 2)}), Carry-Crash-Zusammenhang nach BIS Working Paper 1087. Details und Links im Handbuch.
            </div>
          </div>
        )}

        {fehler && (
          <div className="p-3 rounded-xl border-l-4 border-rose-400 bg-rose-50 text-[12px] font-semibold text-rose-800 flex items-center justify-between gap-2 flex-wrap">
            <span>Bitcoin-Kurzfrist: {fehler}</span>
            <button type="button" onClick={() => laden_(true)} className="inline-flex items-center gap-1 px-2.5 h-7 rounded-lg bg-white border border-rose-200 text-rose-700 text-[11px] font-bold cursor-pointer"><RefreshCw className="h-3.5 w-3.5" /> Erneut</button>
          </div>
        )}
        {!fehler && quellenFehler.length > 0 && (
          <div className="p-3 rounded-xl border-l-4 border-amber-400 bg-amber-50 text-[11px] font-semibold text-amber-800">
            Teilweise ohne Daten: {quellenFehler.map(([q, m]) => `${q === "okx" ? "OKX (Hebel)" : q === "fng" ? "Fear & Greed" : "Yahoo (Zone)"} — ${m}`).join("; ")}
          </div>
        )}
        {laden && !hebel && !zone && (
          <div className="py-6 text-center text-[12px] font-semibold text-slate-500 inline-flex items-center gap-2 w-full justify-center"><Loader2 className="h-4 w-4 animate-spin" /> Perp-Daten und Bitcoin-Kurse werden geladen…</div>
        )}

        {(hebel || zone) && (
          <div className="divide-y divide-slate-200 border-t border-b border-slate-200">
            {zeilen.map(({ id }) => {
              const istHebel = id === "hebel";
              const zustand: BitcoinZustand | null = istHebel ? hebel?.zustand ?? null : zone?.zustand ?? null;
              const z: Farbe = zustand ?? "grau";
              const istOffen = offen.has(id);
              const trend = istHebel ? bitcoinTrend(hebel?.verlauf ?? [], 7) : bitcoinTrend(zone?.verlauf ?? [], 3);
              const status = zustand ? (istHebel ? HEBEL_STATUS[zustand] : ZONE_STATUS[zustand]) : "Fehlt";
              const seit = istHebel ? `seit ${fmtTag(hebelSeit)}` : `seit ${fmtMonat(zone?.seit ?? null)}`;
              return (
                <div key={id} className="py-2.5">
                  <button
                    type="button"
                    onClick={() => toggle(id)}
                    className="w-full flex items-center gap-2.5 text-left cursor-pointer active:bg-slate-50 rounded-lg -mx-1 px-1"
                    title={istOffen ? "Details zuklappen" : "Details aufklappen"}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${PUNKT[z]}`}></span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-1.5 min-w-0">
                        <span className="font-bold text-slate-900 text-[15px] leading-tight shrink-0">{istHebel ? "Hebel" : "Zone"}</span>
                        <span className={`text-[11px] font-bold uppercase tracking-wide leading-none truncate ${TEXT[z]}`}>{status}</span>
                      </div>
                      <div className="text-[12px] text-slate-500 leading-tight truncate">{istHebel ? "Perp-Markt OKX · Funding, OI, Long-Quote" : "Power-Law-Kanal · Mayer · Fear & Greed"}</div>
                    </div>
                    <TrendArrow result={{ direction: trend, changePct: null, hint: TREND_HINT[trend] }} />
                    <div className="text-right shrink-0 min-w-[84px]">
                      {istHebel ? (
                        <>
                          <div className={`font-mono font-bold tabular-nums text-[17px] leading-tight ${z === "ROT" ? "text-rose-600" : "text-slate-900"}`} title="Funding-Rate je 8 Stunden">{fmtFunding(hebel?.funding ?? null)}</div>
                          <div className="text-[11px] font-mono text-slate-500 leading-none mt-0.5" title="Open Interest, Änderung in 24 h">OI 24h {fmtPct(hebel?.oi24h ?? null)}</div>
                        </>
                      ) : (
                        <>
                          <div className={`font-mono font-bold tabular-nums text-[17px] leading-tight ${z === "ROT" ? "text-rose-600" : "text-slate-900"}`} title="Kurs geteilt durch Power-Law-Fit">{zone?.kursZuFit ? `${de(zone.kursZuFit, 2)}× Fit` : "—"}</div>
                          <div className="text-[11px] font-mono text-slate-500 leading-none mt-0.5" title="Mayer Multiple: Kurs / 200-Tage-Schnitt">Mayer {zone?.mayer ? de(zone.mayer, 2) : "—"}</div>
                        </>
                      )}
                      <div className={`text-[12px] font-mono font-semibold tabular-nums leading-none mt-1 ${z === "GRUEN" || z === "grau" ? "text-slate-500" : TEXT[z]}`}>{seit}</div>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-slate-400 shrink-0 transition-transform ${istOffen ? "rotate-180" : ""}`} />
                  </button>

                  {istOffen && (
                    <div className="mt-2.5 ml-5 space-y-2.5 animate-fade-in">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <button
                          type="button"
                          onClick={() => toggleHelp(`v-${id}`)}
                          className="inline-flex items-center gap-1 px-2.5 h-7 rounded-lg bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 text-[11px] font-bold cursor-pointer"
                          title={istHebel ? "Open Interest der letzten 30 Tage" : "Zone der letzten 36 Monate"}
                        >
                          <Info className="h-3.5 w-3.5" /> Verlauf
                        </button>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide leading-none">Schwellen</span>
                          <div className="flex items-center gap-1 flex-wrap justify-end text-[11px] font-mono font-medium tracking-tight leading-none">{schwellen(id)}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleHelp(`h-${id}`)}
                          className="inline-flex items-center gap-1 px-2.5 h-7 rounded-lg text-emerald-700 hover:text-emerald-900 bg-emerald-50 border border-emerald-100 text-[11px] font-bold cursor-pointer"
                          title="Hilfe anzeigen"
                        >
                          <HelpCircle className="h-3.5 w-3.5" /> Hilfe
                        </button>
                      </div>

                      {helpId === `v-${id}` && istHebel && hebel && (() => {
                        const oi = hebel.verlauf.map((t) => t.oiUsd ?? 0);
                        const max = Math.max(...oi), min = Math.min(...oi.filter((v) => v > 0));
                        return (
                          <div className="p-3 rounded-xl border-l-4 border-slate-400 bg-slate-500/5 space-y-2">
                            <div className="text-[11px] font-bold text-slate-700">Open Interest OKX, letzte {hebel.verlauf.length} Tage · Ampel je Tag als Balkenfarbe</div>
                            <div className="grid gap-0.5 h-[42px] items-end" style={{ gridTemplateColumns: `repeat(${hebel.verlauf.length}, minmax(0, 1fr))` }}>
                              {hebel.verlauf.map((t) => (
                                <span
                                  key={t.datum}
                                  className={`block rounded-t-sm ${t.oiUsd ? BAND[t.zustand] : "bg-slate-200"}`}
                                  style={{ height: t.oiUsd && max > min ? `${Math.round(20 + 80 * (t.oiUsd - min) / (max - min))}%` : "20%" }}
                                  title={`${fmtTag(t.datum)}: ${t.oiUsd ? fmtMrd(t.oiUsd) + " USD" : "—"} · ${NAME[t.zustand]}`}
                                ></span>
                              ))}
                            </div>
                            <div className="flex justify-between font-mono text-[10px] text-slate-500">
                              <span>{fmtTag(hebel.verlauf[0]?.datum ?? null)}</span><span>Hoch {fmtMrd(max)}</span><span>{fmtTag(hebel.verlauf[hebel.verlauf.length - 1]?.datum ?? null)}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              {[
                                { k: "Funding / 8h", v: fmtFunding(hebel.funding), n: hebel.funding !== null ? `≈ ${de(hebel.funding * 3 * 365 * 100, 1)} % p. a.` : "", c: hebel.signale.includes("funding") ? (hebel.zustand === "ROT" ? "text-rose-600" : "text-amber-700") : "text-emerald-700" },
                                { k: "Open Interest", v: fmtPct(hebel.oi24h, 1), n: `24 h · ${hebel.oiVomHoch !== null ? de(hebel.oiVomHoch * 100) + " % vom 30-T-Hoch" : "—"}`, c: hebel.signale.includes("oi") ? "text-amber-700" : "text-emerald-700" },
                                { k: "Long-Konten", v: hebel.longQuote !== null ? `${de(hebel.longQuote * 100)} %` : "—", n: `Ratio ${hebel.longShort !== null ? de(hebel.longShort, 2) : "—"}${hebel.longShortVor7T !== null ? ` · vor 7 T ${de(hebel.longShortVor7T, 2)}` : ""}`, c: hebel.signale.includes("long") ? "text-amber-700" : "text-emerald-700" },
                              ].map((x) => (
                                <div key={x.k} className="bg-white/70 border border-slate-200 rounded-xl p-2 min-w-0">
                                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide leading-tight">{x.k}</div>
                                  <div className={`font-mono font-bold text-[13px] tabular-nums mt-0.5 ${x.c}`}>{x.v}</div>
                                  <div className="font-mono text-[10px] text-slate-500 mt-0.5 leading-tight">{x.n}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()}

                      {helpId === `v-${id}` && !istHebel && zone && (
                        <div className="p-3 rounded-xl border-l-4 border-slate-400 bg-slate-500/5 space-y-2">
                          <div className="text-[11px] font-bold text-slate-700">Zone im Power-Law-Kanal, letzte {zone.verlauf.length} Monate</div>
                          <div className="grid gap-px h-[18px] rounded-md overflow-hidden" style={{ gridTemplateColumns: `repeat(${zone.verlauf.length}, minmax(0, 1fr))` }}>
                            {zone.verlauf.map((m) => <span key={m.monat} className={`block ${BAND[m.zustand]}`} title={`${fmtMonat(m.monat)}: ${NAME[m.zustand]} · ${de(m.kursZuFit, 2)}× Fit`}></span>)}
                          </div>
                          <div className="flex justify-between font-mono text-[10px] text-slate-500">
                            <span>{fmtMonat(zone.verlauf[0]?.monat ?? null)}</span><span>{fmtMonat(zone.verlauf[Math.floor(zone.verlauf.length / 2)]?.monat ?? null)}</span><span>{fmtMonat(zone.verlauf[zone.verlauf.length - 1]?.monat ?? null)}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { k: "Kurs / Fit", v: zone.kursZuFit ? `${de(zone.kursZuFit, 2)}×` : "—", n: `Fit ${fmtUsd(zone.fit)}`, c: zone.zustand === "ROT" ? "text-rose-600" : zone.zustand === "GELB" ? "text-amber-700" : "text-emerald-700" },
                              { k: "Kaufzone ab", v: zone.kaufzoneAb ? de(zone.kaufzoneAb) : "—", n: `${de(1 / ZONE_REGEL.kanal, 1)}× Fit · Blase ab ${zone.blaseAb ? de(zone.blaseAb) : "—"}`, c: "text-slate-900" },
                              { k: "Mayer Multiple", v: zone.mayer ? de(zone.mayer, 2) : "—", n: `${ZONE_REGEL.mayerTage}-DMA ${zone.sma ? de(zone.sma) : "—"}`, c: zone.mayer !== null && zone.mayer >= ZONE_REGEL.mayerHoch ? "text-rose-600" : zone.mayer !== null && zone.mayer < ZONE_REGEL.mayerTief ? "text-emerald-700" : "text-slate-900" },
                              { k: "Fear & Greed", v: zone.fng ? `${zone.fng.wert} · ${zone.fng.text}` : "—", n: zone.fngGestern ? `gestern ${zone.fngGestern.wert} · ${zone.fngGestern.text}` : "", c: zone.fng && zone.fng.wert <= ZONE_REGEL.fngAngst ? "text-emerald-700" : zone.fng && zone.fng.wert >= ZONE_REGEL.fngGier ? "text-rose-600" : "text-slate-900" },
                              { k: "Vom 1-J-Hoch", v: fmtPct(zone.abstandJahreshoch, 1), n: zone.datum ? `Stand ${fmtTag(zone.datum)}` : "", c: (zone.abstandJahreshoch ?? 0) <= -0.2 ? "text-rose-600" : "text-slate-900" },
                            ].map((x) => (
                              <div key={x.k} className="bg-white/70 border border-slate-200 rounded-xl p-2 min-w-0">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide leading-tight">{x.k}</div>
                                <div className={`font-mono font-bold text-[13px] tabular-nums mt-0.5 ${x.c}`}>{x.v}</div>
                                <div className="font-mono text-[10px] text-slate-500 mt-0.5 leading-tight">{x.n}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {helpId === `h-${id}` && istHebel && (
                        <div className="p-3.5 text-xs text-slate-650 leading-relaxed font-semibold rounded-xl border-l-4 border-emerald-500 bg-emerald-500/5 space-y-2">
                          <div>
                            <strong className="text-emerald-950">Hebel (Perp-Markt):</strong>{" "}
                            Ewige Futures (Perps) sind die Hebelprodukte, mit denen der größte Teil des Bitcoin-Handels läuft. Drei Werte von OKX zeigen, wie überladen sie sind. <strong>Funding</strong> ist die Gebühr, die Longs alle 8 Stunden an Shorts zahlen, wenn der Perp über dem Spotkurs steht: 0,01 % ist normal, ab {de(HEBEL_REGEL.fundingGelb * 100, 2)} % drängen sich Longs, ab {de(HEBEL_REGEL.fundingRot * 100, 2)} % ist der Markt heiß (vor dem Crash vom 10.10.2025 lag es bei 0,05–0,10 %). <strong>Open Interest</strong> ist das offene Hebelkapital: Springt es in 24 h um {de(HEBEL_REGEL.oiSprung * 100)} % oder mehr, ist neues Geld mit Hebel reingekommen, das bei einem Rutsch zwangsliquidiert wird und den Rutsch verstärkt. <strong>Long-Quote</strong> zählt Konten, nicht Kapital, und schwankt deshalb stark: Erst ab {de(HEBEL_REGEL.longQuote * 100)} % Long gilt die Seite als überfüllt.
                          </div>
                          <div className="p-2.5 bg-white/70 rounded-xl border border-emerald-100 text-[11px] font-semibold text-slate-800">
                            {hebel?.zustand === "GRUEN" && <>Heute ruhig: Funding {fmtFunding(hebel.funding)}, Open Interest {fmtPct(hebel.oi24h, 1)} in 24 h, {hebel.longQuote !== null ? de(hebel.longQuote * 100) : "—"} % Long-Konten. Nachkaufen nach Plan. Gelb käme bei Funding ≥ {de(HEBEL_REGEL.fundingGelb * 100, 2)} %, OI +{de(HEBEL_REGEL.oiSprung * 100)} % in 24 h oder {de(HEBEL_REGEL.longQuote * 100)} % Long.</>}
                            {hebel?.zustand === "GELB" && <>Gedrängt: {hebel.signale.map((s) => s === "funding" ? `Funding ${fmtFunding(hebel.funding)}` : s === "oi" ? `Open Interest ${fmtPct(hebel.oi24h, 1)} in 24 h` : `${de((hebel.longQuote ?? 0) * 100)} % Long-Konten`).join(", ")}. Nachkauf halbieren, Stopps enger, keine eigenen Perps. Rot käme, wenn Funding ≥ {de(HEBEL_REGEL.fundingRot * 100, 2)} % erreicht oder ein OI-Sprung mit erhöhtem Funding zusammenfällt.</>}
                            {hebel?.zustand === "ROT" && <>Heiß: Funding {fmtFunding(hebel.funding)}, Open Interest {fmtPct(hebel.oi24h, 1)} in 24 h. Kein Nachkauf, Rücksetzer von 10–20 % einplanen, Stopps für kurzfristige Positionen eng. Die Longs werden bei einem Rutsch zwangsliquidiert — das ist der Mechanismus hinter Flash-Crashs.</>}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Regel: Rot bei Funding ≥ {de(HEBEL_REGEL.fundingRot * 100, 2)} %/8h oder (OI ≥ +{de(HEBEL_REGEL.oiSprung * 100)} % in 24 h und Funding ≥ {de(HEBEL_REGEL.fundingGelb * 100, 2)} %). Gelb bei einem der drei Signale. Quellen: BIS Working Paper 1087 „Crypto carry“ (hohe Carry-/Funding-Phasen liegen systematisch vor Crashs, getrieben von Hebel-Kleinanlegern), OKX-Daten zu BTC-USDT-SWAP. Binance und Bybit sind vom Server aus nicht erreichbar, OKX ist mit rund 10 % des Perp-Volumens ein brauchbarer Stellvertreter.
                          </div>
                        </div>
                      )}

                      {helpId === `h-${id}` && !istHebel && (
                        <div className="p-3.5 text-xs text-slate-650 leading-relaxed font-semibold rounded-xl border-l-4 border-emerald-500 bg-emerald-500/5 space-y-2">
                          <div>
                            <strong className="text-emerald-950">Zone (Power-Law-Kanal):</strong>{" "}
                            Das Power-Law-Modell sagt, wo Bitcoin nach seinem Langfristtrend heute „sollte“ stehen: log10 Kurs = {de(ZONE_REGEL.alpha, 2)} · log10 Tage seit dem Genesis-Block + c. Dieser Zusammenhang erklärt 96 % der Kursvarianz seit 2010 (arXiv 2605.21316) und schlägt auf 12–24 Monate alle anderen Modelle, auf 1–3 Monate aber nicht den Zufall. Der Kanal ist Faktor {ZONE_REGEL.kanal} nach oben und unten — eine Standardabweichung der Abweichungen. Unter dem Fit war Bitcoin 2015, 2016, 2022/23 und seit November 2025; über dem {ZONE_REGEL.kanal}-fachen Fit nur 2017/18 (bis 7×) und 2021 (3,2×), jedes Mal vor einem Minus von 70–80 %. Der Fit steigt pro Jahr um rund 30 %, die Zonen laufen also mit.
                          </div>
                          <div className="p-2.5 bg-white/70 rounded-xl border border-emerald-100 text-[11px] font-semibold text-slate-800">
                            {zone?.zustand === "GRUEN" && <>Heute {zone.kursZuFit ? de(zone.kursZuFit, 2) : "—"}× Fit ({fmtUsd(zone.kurs)} gegen {fmtUsd(zone.fit)}). {zone.kursZuFit !== null && zone.kursZuFit < 1 / ZONE_REGEL.kanal ? "Kaufzone: historisch die besten Einstiege. Nachkauf verdoppeln, sofern die Hebel-Zeile nicht Rot ist." : `Rücksetzer sind Gelegenheiten. Nachkauf nach Plan, ab ${zone.kaufzoneAb ? de(zone.kaufzoneAb) : "—"} USD (0,5× Fit) Nachkauf verdoppeln.`}</>}
                            {zone?.zustand === "GELB" && <>Heute {zone.kursZuFit ? de(zone.kursZuFit, 2) : "—"}× Fit ({fmtUsd(zone.kurs)} gegen {fmtUsd(zone.fit)}). Normaler Bullenmarkt. Nachkauf nach Plan, keine Hebel. Blasenzone ab {zone.blaseAb ? de(zone.blaseAb) : "—"} USD.</>}
                            {zone?.zustand === "ROT" && <>Heute {zone.kursZuFit ? de(zone.kursZuFit, 2) : "—"}× Fit ({fmtUsd(zone.kurs)} gegen {fmtUsd(zone.fit)}). Blasenzone wie 2017 und 2021. Nachkauf stoppen, Teilverkäufe nach Plan, Stopps unter den 200-Tage-Schnitt.</>}
                            {zone && <> Mayer Multiple {zone.mayer ? de(zone.mayer, 2) : "—"} (Kurs / {ZONE_REGEL.mayerTage}-Tage-Schnitt): unter {de(ZONE_REGEL.mayerTief, 1)} historisch günstig, über {de(ZONE_REGEL.mayerHoch, 1)} überhitzt. Fear &amp; Greed {zone.fng ? `${zone.fng.wert} „${zone.fng.text}“` : "—"}: unter {ZONE_REGEL.fngAngst} bestätigt eine Kaufzone, über {ZONE_REGEL.fngGier} eine Blasenzone — allein ist der Index kein Signal.</>}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Regel: Grün unter 1× Fit (Kaufzone unter {de(1 / ZONE_REGEL.kanal, 1)}×), Gelb 1–{ZONE_REGEL.kanal}×, Rot ab {ZONE_REGEL.kanal}× Fit. Fit mit festem α = {de(ZONE_REGEL.alpha, 2)} auf Coinbase-Tagesschlusskurse 2014–2026 (FRED CBBTCUSD) gelegt. Quellen: arXiv 2605.21316 (Power Law), arXiv 2606.00071 (kurzfristige Vorhersagbarkeit ≈ Rauschen), Trace Mayer (Mayer Multiple, 2017), alternative.me (Fear &amp; Greed). Links im Handbuch.
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 flex-wrap px-1">
          <p className="text-[11px] text-slate-500 m-0">Sortiert: Rot, Gelb, Grün. Hebel: Funding je 8 h, darunter Open Interest 24 h. Zone: Kurs / Power-Law-Fit, darunter Mayer Multiple. Tageswerte — steuert Nachkauf und Stopps, sperrt nichts.</p>
          <button type="button" onClick={() => laden_(true)} disabled={laden} className="inline-flex items-center gap-1 px-2 h-6 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50 text-[10px] font-bold uppercase tracking-wide cursor-pointer" title="Perp-Daten und Kurse neu laden (OKX, alternative.me, Yahoo)">
            {laden ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} Aktualisieren
          </button>
        </div>
      </div>
    </div>
  );
}
