/**
 * BLASEN-AMPEL — einzige Stelle für die Blasen-Regel auf Sektorebene.
 * -----------------------------------------------------------------------
 * Grundlage: Greenwood, Shleifer & You, "Bubbles for Fama", Journal of
 * Financial Economics 2019. Verdoppelt sich eine Branche in zwei Jahren
 * (absolut UND relativ zum Markt), endet das in etwa jedem zweiten Fall
 * innerhalb der folgenden zwei Jahre mit einem Einbruch von >= 40 %.
 *
 * Zustände je Monat (Monatsschlusskurse, Reihenfolge = Schwere):
 *   GRUEN  kein Signal
 *   GELB   Run-up: 2J-Rendite >= 100 % absolut und >= 100 % ueber dem
 *          Benchmark, 5J-Rendite >= 50 % (Filter gegen Erholungs-Rallys),
 *          Kurs hoechstens 25 % unter dem 2J-Hoch (kein Signal mitten im
 *          Crash). Gilt 24 Monate ab dem letzten Signal.
 *   ROT    GELB und Monatsschluss unter dem 10-Monats-Durchschnitt.
 *   Reset  faellt der Kurs >= 40 % unter sein 2J-Hoch, ist der Crash
 *          eingetreten: Fenster endet, zurueck auf GRUEN.
 *
 * Die Ampel steuert NUR Risikobudget, Hebel und Stopps. Sie sperrt nichts —
 * die Kaufsperre kommt ausschliesslich aus evaluateMarketHealth.
 *
 * Reine Funktionen, keine Seiteneffekte. Backtest (FF49 1926–2018, ETFs
 * 1996–2026) im Projekt "RR Morgenroutine", Dokument blasen-indikator-backtest.
 */

export type BlasenZustand = "GRUEN" | "GELB" | "ROT";

/** Monatsschlusskurs: Schluessel "JJJJ-MM" → bereinigter Schlusskurs. */
export type MonatsKurse = Record<string, number>;

export interface BlasenRegel {
  /** Mindest-2J-Rendite absolut und relativ (1.0 = +100 %). */
  schwelle: number;
  /** Mindest-5J-Rendite (0.5 = +50 %); null = Filter aus. */
  schwelle5J: number | null;
  /** Max. Abstand zum 2J-Hoch, damit ein Signal zaehlt (-0.25 = 25 %). */
  maxAbstandHoch: number;
  /** Reset-Schwelle: Abstand zum 2J-Hoch, ab dem der Crash als eingetreten gilt. */
  crashAbstand: number;
  /** Gueltigkeit eines Signals in Monaten. */
  fensterMonate: number;
  /** Laenge des Trendfilters in Monaten. */
  smaMonate: number;
}

export const BLASEN_REGEL: BlasenRegel = {
  schwelle: 1.0,
  schwelle5J: 0.5,
  maxAbstandHoch: -0.25,
  crashAbstand: -0.40,
  fensterMonate: 24,
  smaMonate: 10,
};

export interface SektorDefinition {
  /** Stabile ID (= Yahoo-Symbol). */
  id: string;
  /** Kurzname in der Zeile. */
  kurz: string;
  /** Langname unter dem Kurznamen. */
  lang: string;
  /** Relativ zum Benchmark (S&P 500) pruefen? Fuer Gesamtmaerkte sinnlos. */
  relativ: boolean;
}

/** Benchmark fuer den Relativ-Test (Marktrendite). */
export const BLASEN_BENCHMARK = "SPY";

/**
 * Sektoren der Uebersicht. Reihenfolge = Anzeige. Es sind bewusst
 * Sektor-ETFs und Indizes — die Studie gilt fuer Branchen, nicht fuer
 * Einzelaktien (dort feuert die Monatsregel oft erst nach dem Hoch).
 */
export const BLASEN_SEKTOREN: SektorDefinition[] = [
  { id: "SMH",     kurz: "Halbleiter",   lang: "SMH · VanEck Semiconductor", relativ: true },
  { id: "XLK",     kurz: "Tech",         lang: "XLK · S&P Technology",       relativ: true },
  { id: "QQQ",     kurz: "Nasdaq-100",   lang: "QQQ",                        relativ: true },
  { id: "XBI",     kurz: "Biotech",      lang: "XBI · S&P Biotech",          relativ: true },
  { id: "XLE",     kurz: "Energie",      lang: "XLE · S&P Energy",           relativ: true },
  { id: "GLD",     kurz: "Gold",         lang: "GLD · SPDR Gold",            relativ: true },
  { id: "URA",     kurz: "Uran",         lang: "URA · Global X Uranium",     relativ: true },
  { id: "ICLN",    kurz: "Clean Energy", lang: "ICLN · iShares Clean Energy", relativ: true },
  { id: "LIT",     kurz: "Lithium",      lang: "LIT · Global X Lithium",     relativ: true },
  { id: "ARKK",    kurz: "ARKK",         lang: "ARK Innovation",             relativ: true },
  { id: "BTC-USD", kurz: "Bitcoin",      lang: "BTC-USD (Proxy)",            relativ: true },
  { id: "FXI",     kurz: "China",        lang: "FXI · China Large Cap",      relativ: true },
  { id: "^GDAXI",  kurz: "DAX",          lang: "Deutschland",                relativ: false },
  { id: "^ATX",    kurz: "ATX",          lang: "Österreich",                 relativ: false },
  { id: "SPY",     kurz: "S&P 500",      lang: "SPY · Gesamtmarkt",          relativ: false },
];

export interface BlasenMonat {
  monat: string;            // "JJJJ-MM"
  kurs: number;
  zustand: BlasenZustand;
  signal: boolean;          // Run-up-Bedingung in diesem Monat erfuellt
  rendite2J: number | null; // 1.5 = +150 %
  rendite5J: number | null;
  relativ2J: number | null; // Rendite abzgl. Benchmark
  abstandHoch: number | null; // Kurs / 2J-Hoch - 1
  sma: number | null;
  vsSma: number | null;     // Kurs / SMA - 1
}

export interface BlasenErgebnis {
  id: string;
  monate: BlasenMonat[];
  /** Letzter vollstaendiger Monat. */
  aktuell: BlasenMonat | null;
  /** Erster Monat des aktuellen Zustands ("seit"). */
  seit: string | null;
  /** Zahl der Monate mit Daten. */
  nMonate: number;
}

/** Monatsschluessel sortiert aufsteigend. */
export function sortierteMonate(k: MonatsKurse): string[] {
  return Object.keys(k).filter((m) => /^\d{4}-\d{2}$/.test(m) && isFinite(k[m]) && k[m] > 0).sort();
}

/** Monatsschluessel um n Monate verschieben ("2026-03", -24 → "2024-03"). */
export function monatPlus(monat: string, n: number): string {
  const [j, m] = monat.split("-").map(Number);
  const idx = j * 12 + (m - 1) + n;
  const jj = Math.floor(idx / 12);
  const mm = (idx % 12) + 1;
  return `${jj}-${String(mm).padStart(2, "0")}`;
}

/** Differenz zweier Monatsschluessel in Monaten (b - a). */
export function monatsDifferenz(a: string, b: string): number {
  const [ja, ma] = a.split("-").map(Number);
  const [jb, mb] = b.split("-").map(Number);
  return (jb * 12 + mb) - (ja * 12 + ma);
}

/** Kurs zu einem Monat; fehlt er (Datenluecke), naechster Nachbar bis ±tol Monate. */
export function kursBei(k: MonatsKurse, monat: string, tol = 2): number | null {
  if (k[monat] > 0) return k[monat];
  for (let d = 1; d <= tol; d++) {
    const a = k[monatPlus(monat, -d)]; if (a > 0) return a;
    const b = k[monatPlus(monat, d)]; if (b > 0) return b;
  }
  return null;
}

/**
 * Ampel fuer eine Kursreihe berechnen.
 * @param kurse     Monatsschlusskurse des Sektors (nur abgeschlossene Monate!)
 * @param benchmark Monatsschlusskurse des Benchmarks oder null (kein Relativ-Test)
 */
export function berechneBlasenAmpel(
  id: string,
  kurse: MonatsKurse,
  benchmark: MonatsKurse | null,
  regel: BlasenRegel = BLASEN_REGEL,
): BlasenErgebnis {
  const monate = sortierteMonate(kurse);
  const out: BlasenMonat[] = [];
  let fensterEnde: string | null = null;

  for (let i = 0; i < monate.length; i++) {
    const m = monate[i];
    const kurs = kurse[m];
    const vor24 = kursBei(kurse, monatPlus(m, -24));
    const vor60 = kursBei(kurse, monatPlus(m, -60));
    const rendite2J = vor24 ? kurs / vor24 - 1 : null;
    const rendite5J = vor60 ? kurs / vor60 - 1 : null;

    let relativ2J: number | null = null;
    if (benchmark) {
      const b0 = kursBei(benchmark, m);
      const b24 = kursBei(benchmark, monatPlus(m, -24));
      if (b0 && b24 && rendite2J !== null) relativ2J = rendite2J - (b0 / b24 - 1);
    }

    // 2J-Hoch inkl. aktuellem Monat (Kalenderfenster, robust gegen Datenluecken)
    const ab = monatPlus(m, -23);
    let hoch = 0;
    for (let k = i; k >= 0 && monate[k] >= ab; k--) hoch = Math.max(hoch, kurse[monate[k]]);
    const abstandHoch = hoch > 0 ? kurs / hoch - 1 : null;

    // 10-Monats-Durchschnitt
    let sma: number | null = null;
    if (i >= regel.smaMonate - 1) {
      let s = 0;
      for (let k = i - regel.smaMonate + 1; k <= i; k++) s += kurse[monate[k]];
      sma = s / regel.smaMonate;
    }
    const vsSma = sma ? kurs / sma - 1 : null;

    // Run-up-Bedingung
    let signal = rendite2J !== null && rendite2J >= regel.schwelle
      && abstandHoch !== null && abstandHoch >= regel.maxAbstandHoch;
    if (signal && benchmark) signal = relativ2J !== null && relativ2J >= regel.schwelle;
    if (signal && regel.schwelle5J !== null && rendite5J !== null) signal = rendite5J >= regel.schwelle5J;

    // Fenster fuehren: Signal verlaengert, Crash beendet
    if (signal) fensterEnde = monatPlus(m, regel.fensterMonate);
    if (abstandHoch !== null && abstandHoch <= regel.crashAbstand) fensterEnde = null;
    const gelb = fensterEnde !== null && m <= fensterEnde;

    let zustand: BlasenZustand = "GRUEN";
    if (gelb) zustand = sma !== null && kurs < sma ? "ROT" : "GELB";

    out.push({ monat: m, kurs, zustand, signal, rendite2J, rendite5J, relativ2J, abstandHoch, sma, vsSma });
  }

  const aktuell = out.length ? out[out.length - 1] : null;
  let seit: string | null = null;
  if (aktuell) {
    seit = aktuell.monat;
    for (let i = out.length - 2; i >= 0 && out[i].zustand === aktuell.zustand; i--) seit = out[i].monat;
  }
  return { id, monate: out, aktuell, seit, nMonate: out.length };
}

/** Rang fuer Sortierung und Trendpfeil (hoeher = schlechter). */
export const BLASEN_RANG: Record<BlasenZustand, number> = { GRUEN: 0, GELB: 1, ROT: 2 };

/**
 * Trend der Ampel: Vergleich des Zustands vor `fenster` Monaten mit heute.
 * "good" = Lage verbessert, "bad" = verschlechtert, "flat" = gleich.
 */
export function blasenTrend(e: BlasenErgebnis, fenster = 3): "good" | "flat" | "bad" | "none" {
  const n = e.monate.length;
  if (n < fenster + 1) return "none";
  const jetzt = BLASEN_RANG[e.monate[n - 1].zustand];
  const vorher = BLASEN_RANG[e.monate[n - 1 - fenster].zustand];
  if (jetzt < vorher) return "good";
  if (jetzt > vorher) return "bad";
  return "flat";
}

/**
 * Tagesschluesse (JJJJ-MM-TT → Kurs) zu Monatsschluessen verdichten.
 * Der laufende Monat wird nur uebernommen, wenn `inklLaufend` gesetzt ist.
 */
export function zuMonatsschluessen(tage: Record<string, number>, heute: string, inklLaufend = false): MonatsKurse {
  const out: MonatsKurse = {};
  const laufend = heute.slice(0, 7);
  for (const d of Object.keys(tage).sort()) {
    const m = d.slice(0, 7);
    if (!inklLaufend && m === laufend) continue;
    const v = tage[d];
    if (isFinite(v) && v > 0) out[m] = v; // sortiert → letzter Tag des Monats gewinnt
  }
  return out;
}
