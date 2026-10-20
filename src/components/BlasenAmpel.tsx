/**
 * BLASEN-AMPEL (Sektoren) — Karte in der Morgenroutine.
 * -------------------------------------------------------
 * Optik wie "Marktstimmung & Kaufschranken": eine Watchlist-Zeile pro
 * Sektor-ETF (Ampelpunkt, Name + Status, Trendpfeil, Wert rechts), antippen
 * klappt Verlauf (36 Monate), Schwellen und Hilfe auf.
 *
 * Daten: /api/blasen-monatskurse (Yahoo-Monatsschluesse, Server-Cache 12 h;
 * der Client schickt die Symbolliste aus utils/blasenAmpel.ts mit),
 * im Browser zusaetzlich 12 h in localStorage gehalten. Die Regel selbst
 * steht NUR in utils/blasenAmpel.ts.
 *
 * Die Ampel steuert Risikobudget, Hebel und Stopps — sie sperrt nichts.
 */
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, HelpCircle, Info, Loader2, RefreshCw } from "lucide-react";
import HilfeLink from "./HilfeLink";
import { TrendArrow } from "./TrendBarometer";
import {
  BLASEN_BENCHMARK, BLASEN_RANG, BLASEN_REGEL, BLASEN_SEKTOREN, BlasenErgebnis, BlasenZustand, MonatsKurse,
  berechneBlasenAmpel, blasenTrend,
} from "../utils/blasenAmpel";
import ModulKopf from "./ModulKopf";

const CACHE_KEY = "morgenroutine_blasen_monatskurse";
const CACHE_TTL = 12 * 60 * 60 * 1000;

interface MonatsAntwort {
  reihen: Record<string, { kurse: MonatsKurse; laufend: { monat: string; kurs: number } | null }>;
  fehler?: Record<string, string>;
  generatedAt: string;
}

const PUNKT: Record<BlasenZustand | "grau", string> = {
  GRUEN: "bg-emerald-500",
  GELB: "bg-amber-400",
  ROT: "bg-rose-500 animate-pulse",
  grau: "bg-slate-300 animate-pulse",
};
const TEXT: Record<BlasenZustand | "grau", string> = {
  GRUEN: "text-emerald-700",
  GELB: "text-amber-700",
  ROT: "text-rose-600",
  grau: "text-slate-500",
};
const BAND: Record<BlasenZustand, string> = { GRUEN: "bg-emerald-500", GELB: "bg-amber-400", ROT: "bg-rose-500" };
const STATUS: Record<BlasenZustand, string> = { GRUEN: "OK", GELB: "Blase", ROT: "Trendbruch" };
const NAME: Record<BlasenZustand, string> = { GRUEN: "Grün", GELB: "Gelb", ROT: "Rot" };

const fmtPct = (v: number | null, nk = 0) =>
  v === null || !isFinite(v) ? "—" : `${v > 0 ? "+" : v < 0 ? "−" : ""}${Math.abs(v * 100).toLocaleString("de-DE", { minimumFractionDigits: nk, maximumFractionDigits: nk })} %`;
const fmtMonat = (m: string | null) => (m ? `${m.slice(5, 7)}/${m.slice(0, 4)}` : "—");

const TREND_HINT = { good: "Ampel hat sich in 3 Monaten verbessert", flat: "Ampel seit 3 Monaten unverändert", bad: "Ampel hat sich in 3 Monaten verschlechtert", none: "Zu wenig Historie" } as const;

export default function BlasenAmpel() {
  const [daten, setDaten] = useState<MonatsAntwort | null>(() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const c = JSON.parse(raw) as { ts: number; data: MonatsAntwort };
      return c?.data?.reihen ? c.data : null;
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
          const c = JSON.parse(raw) as { ts: number; data: MonatsAntwort };
          if (c?.ts && Date.now() - c.ts < CACHE_TTL && c.data?.reihen) { setDaten(c.data); return; }
        }
      }
    } catch { /* Cache kaputt → neu laden */ }
    setLaden(true); setFehler(null);
    try {
      const r = await fetch("/api/blasen-monatskurse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ benchmark: BLASEN_BENCHMARK, symbole: BLASEN_SEKTOREN.map((s) => s.id) }),
      });
      const d = await r.json();
      if (!r.ok || !d?.reihen) throw new Error(d?.error || `HTTP ${r.status}`);
      setDaten(d);
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: d })); } catch { /* voll */ }
    } catch (e: any) {
      setFehler(e?.message || "Monatskurse konnten nicht geladen werden.");
    } finally {
      setLaden(false);
    }
  };
  useEffect(() => { laden_(); }, []);

  const ergebnisse = useMemo(() => {
    if (!daten?.reihen) return [] as (BlasenErgebnis & { kurz: string; lang: string })[];
    const bench = daten.reihen[BLASEN_BENCHMARK]?.kurse ?? null;
    const liste = BLASEN_SEKTOREN
      .filter((s) => daten.reihen[s.id]?.kurse)
      .map((s, reihe) => ({ ...berechneBlasenAmpel(s.id, daten.reihen[s.id].kurse, s.relativ ? bench : null), kurz: s.kurz, lang: s.lang, reihe }));
    // Sortierung: Rot oben, dann Gelb, dann Gruen; innerhalb einer Farbe die
    // feste Reihenfolge der Sektorliste, damit nichts hin- und herspringt.
    const rang = (e: typeof liste[number]) => (e.aktuell ? BLASEN_RANG[e.aktuell.zustand] : -1);
    return liste.sort((a, b) => rang(b) - rang(a) || a.reihe - b.reihe);
  }, [daten]);

  const ids = ergebnisse.map((e) => e.id);
  const alleOffen = ids.length > 0 && ids.every((id) => offen.has(id));
  const toggle = (id: string) => setOffen((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleHelp = (id: string) => setHelpId((h) => (h === id ? null : id));

  const anzahl: Record<BlasenZustand, number> = { GRUEN: 0, GELB: 0, ROT: 0 };
  ergebnisse.forEach((e) => { if (e.aktuell) anzahl[e.aktuell.zustand]++; });
  const stand = ergebnisse[0]?.aktuell?.monat ?? null;

  return (
    <div data-modul="blasen-ampel" className="bg-white border border-slate-100 rounded-3xl p-3.5 sm:p-8 space-y-6 shadow-md shadow-slate-200/20">
      <ModulKopf modulId="blasen-ampel"
        symbol="🫧"
        titel="Blasen-Ampel (Sektoren)"
        untertitel="Verdoppelt in zwei Jahren? · sperrt keinen Kauf"
        hilfe={<HilfeLink abschnitt="blasen-ampel" titel="Blasen-Ampel im Handbuch nachlesen" />}
      />

      {ergebnisse.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {(["ROT", "GELB", "GRUEN"] as BlasenZustand[]).map((z) => (
            <span key={z} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-50 border border-slate-200 text-slate-700">
              <span className={`w-2 h-2 rounded-full ${BAND[z]}`}></span>{anzahl[z]} {NAME[z]}
            </span>
          ))}
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold text-slate-500">Stand: Monatsschluss {fmtMonat(stand)}</span>
        </div>
      )}

      <div className="space-y-2.5">
        <div className="flex items-center justify-between px-1 gap-2">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sektoren &amp; Status</span>
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
              <strong className="text-slate-900">Blasen-Ampel — was die Farben bedeuten</strong><br />
              Grundlage ist die Harvard-Studie „Bubbles for Fama“ (Greenwood, Shleifer &amp; You, 2019): Verdoppelt sich eine Branche in zwei Jahren, endet das in etwa jedem zweiten Fall innerhalb der nächsten zwei Jahre mit einem Einbruch von mindestens 40 %. Gerechnet wird mit Monatsschlusskursen — die Ampel ändert sich selten.
            </div>
            <ul className="list-disc pl-4 space-y-1 font-bold">
              <li><span className="text-emerald-700">Grün — kein Signal.</span> Normales Risikobudget.</li>
              <li><span className="text-amber-700">Gelb — Blasen-Signal.</span> Plus 100 % in 2 Jahren, absolut und relativ zum S&amp;P 500. Gilt 24 Monate. Risikobudget im Sektor halbieren, keine neuen Hebelpositionen, Stopps nachziehen.</li>
              <li><span className="text-rose-700">Rot — Trendbruch.</span> Gelb und Monatsschluss unter dem 10-Monats-Durchschnitt. Exposure stark reduzieren, Wiedereinstieg erst nach neuem Trendsignal.</li>
            </ul>
            <div className="p-2.5 bg-white/70 rounded-xl border border-emerald-100 text-[11px] font-semibold text-slate-800">
              <strong>Die Ampel ist kein Verkaufssignal.</strong> Nach dem Gelb-Signal stiegen die Kurse historisch im Schnitt noch 5–6 Monate und 25–60 % weiter. Sie steuert nur Positionsgröße, Hebel und Stopps. Sie sperrt nichts — die Kaufsperre kommt ausschließlich aus den Kaufschranken.
            </div>
            <div className="text-[11px] text-slate-500">
              Zurücksetzen: Fällt ein Sektor 40 % unter sein 2-Jahres-Hoch, ist der Crash eingetreten und die Ampel springt auf Grün. Großer Wert rechts = Anstieg in 2 Jahren, darunter Abstand zum 10-Monats-Durchschnitt, „seit“ = Monat des letzten Ampelwechsels.
            </div>
          </div>
        )}

        {fehler && (
          <div className="p-3 rounded-xl border-l-4 border-rose-400 bg-rose-50 text-[12px] font-semibold text-rose-800 flex items-center justify-between gap-2 flex-wrap">
            <span>Blasen-Ampel: {fehler}</span>
            <button type="button" onClick={() => laden_(true)} className="inline-flex items-center gap-1 px-2.5 h-7 rounded-lg bg-white border border-rose-200 text-rose-700 text-[11px] font-bold cursor-pointer"><RefreshCw className="h-3.5 w-3.5" /> Erneut</button>
          </div>
        )}
        {laden && ergebnisse.length === 0 && (
          <div className="py-6 text-center text-[12px] font-semibold text-slate-500 inline-flex items-center gap-2 w-full justify-center"><Loader2 className="h-4 w-4 animate-spin" /> Monatskurse der Sektoren werden geladen…</div>
        )}

        {ergebnisse.length > 0 && (
          <div className="divide-y divide-slate-200 border-t border-b border-slate-200">
            {ergebnisse.map((e) => {
              const a = e.aktuell;
              const z: BlasenZustand | "grau" = a ? a.zustand : "grau";
              const istOffen = offen.has(e.id);
              const trend = blasenTrend(e);
              const band = e.monate.slice(-36);
              const zuWenig = a && a.rendite2J === null;
              return (
                <div key={e.id} className="py-2.5">
                  <button
                    type="button"
                    onClick={() => toggle(e.id)}
                    className="w-full flex items-center gap-2.5 text-left cursor-pointer active:bg-slate-50 rounded-lg -mx-1 px-1"
                    title={istOffen ? "Details zuklappen" : "Details aufklappen"}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${PUNKT[z]}`}></span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-1.5 min-w-0">
                        <span className="font-bold text-slate-900 text-[15px] leading-tight shrink-0">{e.kurz}</span>
                        <span className={`text-[11px] font-bold uppercase tracking-wide leading-none truncate ${TEXT[z]}`}>{a ? (zuWenig ? "Zu kurz" : STATUS[a.zustand]) : "Fehlt"}</span>
                      </div>
                      <div className="text-[12px] text-slate-500 leading-tight truncate">{e.lang}</div>
                    </div>
                    <TrendArrow result={{ direction: trend, changePct: null, hint: TREND_HINT[trend] }} />
                    <div className="text-right shrink-0 min-w-[84px]">
                      <div className={`font-mono font-bold tabular-nums text-[17px] leading-tight ${z === "ROT" ? "text-rose-600" : "text-slate-900"}`} title="Anstieg in 2 Jahren">{fmtPct(a?.rendite2J ?? null)}</div>
                      <div className="text-[11px] font-mono text-slate-500 leading-none mt-0.5" title="Kurs gegenüber 10-Monats-Durchschnitt">SMA10 {fmtPct(a?.vsSma ?? null)}</div>
                      <div className={`text-[12px] font-mono font-semibold tabular-nums leading-none mt-1 ${z === "GRUEN" || z === "grau" ? "text-slate-500" : TEXT[z]}`}>seit {fmtMonat(e.seit)}</div>
                    </div>
                    <ChevronDown className={`h-4 w-4 text-slate-400 shrink-0 transition-transform ${istOffen ? "rotate-180" : ""}`} />
                  </button>

                  {istOffen && (
                    <div className="mt-2.5 ml-5 space-y-2.5 animate-fade-in">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <button
                          type="button"
                          onClick={() => toggleHelp(`v-${e.id}`)}
                          className="inline-flex items-center gap-1 px-2.5 h-7 rounded-lg bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 text-[11px] font-bold cursor-pointer"
                          title="Ampel-Verlauf der letzten 36 Monate"
                        >
                          <Info className="h-3.5 w-3.5" /> Verlauf
                        </button>
                        <div className="flex flex-col items-end gap-1">
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wide leading-none">Schwellen</span>
                          <div className="flex items-center gap-1 flex-wrap justify-end text-[11px] font-mono font-medium tracking-tight leading-none">
                            <span className="text-emerald-700">&lt;{Math.round(BLASEN_REGEL.schwelle * 100)} %</span><span className="text-slate-300">|</span>
                            <span className="text-amber-600">≥{Math.round(BLASEN_REGEL.schwelle * 100)} % in 2 J</span><span className="text-slate-300">|</span>
                            <span className="text-rose-600">&amp; &lt;SMA{BLASEN_REGEL.smaMonate}</span>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleHelp(`h-${e.id}`)}
                          className="inline-flex items-center gap-1 px-2.5 h-7 rounded-lg text-emerald-700 hover:text-emerald-900 bg-emerald-50 border border-emerald-100 text-[11px] font-bold cursor-pointer"
                          title="Hilfe anzeigen"
                        >
                          <HelpCircle className="h-3.5 w-3.5" /> Hilfe
                        </button>
                      </div>

                      {helpId === `v-${e.id}` && (
                        <div className="p-3 rounded-xl border-l-4 border-slate-400 bg-slate-500/5 space-y-2">
                          <div className="text-[11px] font-bold text-slate-700">Ampel-Verlauf, letzte {band.length} Monate</div>
                          <div className="grid gap-px h-[18px] rounded-md overflow-hidden" style={{ gridTemplateColumns: `repeat(${band.length}, minmax(0, 1fr))` }}>
                            {band.map((m) => <span key={m.monat} className={`block ${BAND[m.zustand]}`} title={`${fmtMonat(m.monat)}: ${NAME[m.zustand]} · 2 J ${fmtPct(m.rendite2J)}`}></span>)}
                          </div>
                          <div className="flex justify-between font-mono text-[10px] text-slate-500">
                            <span>{fmtMonat(band[0]?.monat ?? null)}</span><span>{fmtMonat(band[Math.floor(band.length / 2)]?.monat ?? null)}</span><span>{fmtMonat(band[band.length - 1]?.monat ?? null)}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            {[
                              { k: "2-Jahres-Anstieg", v: fmtPct(a?.rendite2J ?? null, 1), c: (a?.rendite2J ?? 0) >= BLASEN_REGEL.schwelle ? "text-amber-700" : "text-slate-900" },
                              { k: "Relativ S&P 500", v: a?.relativ2J === null || a?.relativ2J === undefined ? "n. a." : fmtPct(a.relativ2J, 1), c: (a?.relativ2J ?? 0) >= BLASEN_REGEL.schwelle ? "text-amber-700" : "text-slate-900" },
                              { k: "Abstand 2-J-Hoch", v: fmtPct(a?.abstandHoch ?? null, 1), c: (a?.abstandHoch ?? 0) <= BLASEN_REGEL.crashAbstand ? "text-rose-600" : "text-slate-900" },
                            ].map((x) => (
                              <div key={x.k} className="bg-white/70 border border-slate-200 rounded-xl p-2 min-w-0">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide leading-tight">{x.k}</div>
                                <div className={`font-mono font-bold text-[13px] tabular-nums mt-0.5 ${x.c}`}>{x.v}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {helpId === `h-${e.id}` && (
                        <div className="p-3.5 text-xs text-slate-650 leading-relaxed font-semibold rounded-xl border-l-4 border-emerald-500 bg-emerald-500/5 space-y-2">
                          <div>
                            <strong className="text-emerald-950">{e.kurz} ({e.lang}):</strong>{" "}
                            {a?.zustand === "ROT" && "Blasen-Signal aktiv und der Monatsschluss liegt unter dem 10-Monats-Durchschnitt. Für Depotwerte aus diesem Sektor: keine Neukäufe, Hebel abbauen, Stopps eng. Wiedereinstieg erst, wenn der Monatsschluss wieder über dem Durchschnitt liegt."}
                            {a?.zustand === "GELB" && "Der Sektor hat sich in zwei Jahren mehr als verdoppelt, auch gegenüber dem Gesamtmarkt. Historisch crasht danach etwa jeder zweite Sektor, der andere steigt weiter. Deshalb: Positionsgröße halbieren, keine neuen Hebelpositionen, Stopps nachziehen — aber nicht shorten."}
                            {a?.zustand === "GRUEN" && !zuWenig && "Kein Blasen-Signal. Der Anstieg in zwei Jahren liegt unter 100 % oder der Sektor hat den S&P 500 nicht um 100 % geschlagen. Normales Risikobudget."}
                            {zuWenig && "Noch keine zwei Jahre Kurshistorie — die Regel kann hier nicht rechnen."}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Regel: +{Math.round(BLASEN_REGEL.schwelle * 100)} % in 2 Jahren absolut{BLASEN_SEKTOREN.find((s) => s.id === e.id)?.relativ ? " und gegenüber dem S&P 500" : " (Gesamtmarkt, kein Relativ-Test)"}, 5-Jahres-Rendite ≥ {Math.round((BLASEN_REGEL.schwelle5J ?? 0) * 100)} %, Kurs höchstens {Math.round(-BLASEN_REGEL.maxAbstandHoch * 100)} % unter dem 2-Jahres-Hoch. Rot = zusätzlich Monatsschluss unter dem {BLASEN_REGEL.smaMonate}-Monats-Durchschnitt. Reset bei {Math.round(BLASEN_REGEL.crashAbstand * 100)} % vom 2-Jahres-Hoch.
                            {e.nMonate < 60 ? ` Historie: ${e.nMonate} Monate (5-Jahres-Filter greift erst ab 60).` : ""}
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
          <p className="text-[11px] text-slate-500 m-0">Sortiert: Rot, Gelb, Grün. Zeile antippen → Verlauf (36 Monate), Schwellen und Hilfe. Monatsregel — kein Tagessignal.</p>
          <button type="button" onClick={() => laden_(true)} disabled={laden} className="inline-flex items-center gap-1 px-2 h-6 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50 text-[10px] font-bold uppercase tracking-wide cursor-pointer" title="Monatskurse neu laden (Yahoo)">
            {laden ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />} Aktualisieren
          </button>
        </div>
      </div>
    </div>
  );
}
