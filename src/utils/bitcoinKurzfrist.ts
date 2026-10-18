/**
 * BITCOIN-KURZFRIST — einzige Stelle für die zwei Bitcoin-Zeilen "Hebel" und "Zone".
 * -----------------------------------------------------------------------------------
 * Die Blasen-Ampel sieht Bitcoin nur monatlich. Diese Datei beantwortet die
 * zwei Fragen davor:
 *
 *   HEBEL  Ist der Perp-Markt (ewige Futures) überladen? Überladene Longs sind
 *          der Treibstoff für Flash-Crashs (10.10.2025, 17./18.10.2026): Bei
 *          einem Rutsch werden sie zwangsliquidiert, der Verkaufsdruck
 *          verstärkt sich selbst. Drei Messgrößen von OKX:
 *            - Funding-Rate je 8 h: Gebühr, die Longs an Shorts zahlen (oder
 *              umgekehrt). 0,01 % ist der Normalwert, ab 0,03 % drängen sich
 *              Longs, ab 0,06 % ist der Markt heiß.
 *            - Open Interest (offenes Hebelkapital): +8 % in 24 h heißt, neues
 *              Hebelgeld ist reingekommen, das bei einem Rutsch liquidiert wird.
 *            - Long-Quote der Konten: ab 70 % Long steht die Mehrheit auf
 *              einer Seite (Konten, nicht Kapital → schwankt stark).
 *          Quellen: BIS Working Paper 1087 (Krypto-Carry: hohe Funding-Phasen
 *          liegen systematisch vor Crashs); OKX-Daten.
 *
 *   ZONE   Wo steht der Kurs im Power-Law-Kanal? Das Power-Law-Modell
 *          (log10 Kurs = α · log10 Tage seit Genesis + c, α = 5,64) erklärt
 *          96 % der Kursvarianz seit 2010 (arXiv 2605.21316). Unter dem Fit war
 *          Bitcoin 2015, 2016, 2022/23 und seit November 2025; über dem
 *          doppelten Fit nur 2017/18 (bis 7×) und 2021 (3,2×) — jedes Mal vor
 *          einem Minus von 70–80 %. Nebenwerte: Mayer Multiple (Kurs / 200-
 *          Tage-Schnitt, Trace Mayer 2017) und Fear & Greed (alternative.me)
 *          als Bestätigung, nie als eigenes Signal.
 *
 * Zustände (Reihenfolge = Schwere): GRUEN < GELB < ROT.
 *
 *   Hebel  ROT   Funding >= 0,06 %/8h ODER (OI-24h >= +8 % UND Funding >= 0,03 %)
 *          GELB  Funding >= 0,03 %/8h ODER OI-24h >= +8 % ODER Long-Quote >= 70 %
 *          GRUEN sonst
 *   Zone   ROT   Kurs >= 2 × Fit (Blasenzone)
 *          GELB  Kurs zwischen 1 × und 2 × Fit (normaler Bullenmarkt)
 *          GRUEN Kurs unter dem Fit; unter 0,5 × Fit = Kaufzone
 *
 * Beide Zeilen steuern NUR Nachkauf-Tempo und Stopps beim Power-Law-Hold.
 * Sie sperren nichts — die Kaufsperre kommt ausschließlich aus
 * evaluateMarketHealth. Kurzfristig ist Bitcoin laut arXiv 2606.00071 fast
 * reines Rauschen: Die Zeilen sagen nicht, WANN es dreht, sondern wie groß
 * ein Rutsch werden kann (Hebel) und ob er eine Gelegenheit ist (Zone).
 *
 * Reine Funktionen, keine Seiteneffekte. Der Server (/api/bitcoin-kurzfrist)
 * liefert nur Rohdaten, gerechnet wird hier.
 */

export type BitcoinZustand = "GRUEN" | "GELB" | "ROT";

export const BITCOIN_RANG: Record<BitcoinZustand, number> = { GRUEN: 0, GELB: 1, ROT: 2 };

export interface HebelRegel {
  /** Funding je 8 h, ab dem Longs gedrängt sind (0.0003 = 0,03 %). */
  fundingGelb: number;
  /** Funding je 8 h, ab dem der Markt heiß ist (0.0006 = 0,06 %). */
  fundingRot: number;
  /** Open-Interest-Sprung in 24 h, der als Zufluss von Hebelgeld zählt (0.08 = +8 %). */
  oiSprung: number;
  /** Anteil Long-Konten, ab dem die Mehrheit auf einer Seite steht (0.70 = 70 %). */
  longQuote: number;
}

export interface ZoneRegel {
  /** Power-Law-Exponent α (arXiv 2605.21316: 5,64). */
  alpha: number;
  /** Achsenabschnitt c, gefittet mit festem α auf Coinbase-Tagesschlusskurse 2014-12 bis 2026-10. */
  c: number;
  /** Genesis-Block als Nullpunkt der Tageszählung (UTC). */
  genesis: string;
  /** Kanalbreite: Faktor nach oben und unten (2 = eine Standardabweichung der log-Abweichungen). */
  kanal: number;
  /** Länge des gleitenden Schnitts für das Mayer Multiple (Tage). */
  mayerTage: number;
  /** Mayer Multiple, unter dem der Kurs historisch günstig war. */
  mayerTief: number;
  /** Mayer Multiple, über dem der Kurs historisch überhitzt war. */
  mayerHoch: number;
  /** Fear & Greed, unter dem die Kaufzone bestätigt gilt. */
  fngAngst: number;
  /** Fear & Greed, über dem die Blasenzone bestätigt gilt. */
  fngGier: number;
}

export const HEBEL_REGEL: HebelRegel = {
  fundingGelb: 0.0003,
  fundingRot: 0.0006,
  oiSprung: 0.08,
  longQuote: 0.70,
};

export const ZONE_REGEL: ZoneRegel = {
  alpha: 5.64,
  c: -16.377604,
  genesis: "2009-01-03",
  kanal: 2,
  mayerTage: 200,
  mayerTief: 0.8,
  mayerHoch: 2.4,
  fngAngst: 25,
  fngGier: 75,
};

/** Perp-Instrument auf OKX und Kurs-Symbol bei Yahoo. */
export const BITCOIN_QUELLEN = {
  perp: "BTC-USDT-SWAP",
  kurs: "BTC-USD",
  /** Yahoo-Zeitraum für Tagesschlusskurse (36 Monate Zonen-Verlauf + 200 Tage Vorlauf). */
  kursRange: "3y",
} as const;

// ── Rohdaten vom Server ────────────────────────────────────────────────

/** Ein Tag Perp-Daten (UTC-Datum "JJJJ-MM-TT"). */
export interface HebelTag {
  datum: string;
  /** Mittlere Funding-Rate der Abrechnungen des Tages (Anteil, 0.0001 = 0,01 %). */
  funding: number | null;
  /** Open Interest in USD am Tagesende. */
  oiUsd: number | null;
  /** Long/Short-Verhältnis der Konten (1.0 = gleich viele). */
  longShort: number | null;
}

export interface BitcoinRohdaten {
  /** Aktuelle Funding-Rate (Anteil) und Zeitpunkt der nächsten Abrechnung. */
  fundingAktuell: { rate: number; naechste: string } | null;
  /** Tageswerte, aufsteigend nach Datum, letzte 30 Tage. */
  hebelTage: HebelTag[];
  /** Tagesschlusskurse "JJJJ-MM-TT" → USD, aufsteigend. */
  kurse: Record<string, number>;
  /** Fear & Greed: heute und gestern (0–100). */
  fng: { wert: number; text: string; datum: string }[];
  /** Je Quelle eine Fehlermeldung, wenn sie nicht ladbar war. */
  fehler?: Record<string, string>;
  generatedAt: string;
}

// ── Hebel ──────────────────────────────────────────────────────────────

export interface HebelErgebnis {
  zustand: BitcoinZustand;
  /** Funding je 8 h als Anteil (aktuell, sonst letzter Tageswert). */
  funding: number | null;
  /** Open-Interest-Änderung in 24 h als Anteil. */
  oi24h: number | null;
  /** Open Interest heute in USD. */
  oiUsd: number | null;
  /** Open Interest in Prozent vom 30-Tage-Hoch (1.0 = am Hoch). */
  oiVomHoch: number | null;
  /** Anteil Long-Konten (0.65 = 65 %). */
  longQuote: number | null;
  /** Long/Short-Verhältnis der Konten. */
  longShort: number | null;
  /** Long/Short-Verhältnis vor 7 Tagen (Richtung). */
  longShortVor7T: number | null;
  /** Welche Teilsignale gerade anschlagen, für die Hilfe. */
  signale: ("funding" | "oi" | "long")[];
}

/** Long-Quote aus dem Long/Short-Verhältnis: L/S = 1,87 → 1,87 / 2,87 = 65 %. */
export function longQuoteAusRatio(ls: number | null): number | null {
  return ls === null || !isFinite(ls) || ls < 0 ? null : ls / (1 + ls);
}

/** Hebel-Zustand aus den drei Teilwerten (jede Größe darf fehlen). */
export function hebelZustand(funding: number | null, oi24h: number | null, longQuote: number | null, regel: HebelRegel = HEBEL_REGEL): { zustand: BitcoinZustand; signale: HebelErgebnis["signale"] } {
  const signale: HebelErgebnis["signale"] = [];
  const fundingGelb = funding !== null && funding >= regel.fundingGelb;
  const fundingRot = funding !== null && funding >= regel.fundingRot;
  const oiSprung = oi24h !== null && oi24h >= regel.oiSprung;
  const longVoll = longQuote !== null && longQuote >= regel.longQuote;
  if (fundingGelb) signale.push("funding");
  if (oiSprung) signale.push("oi");
  if (longVoll) signale.push("long");
  if (fundingRot || (oiSprung && fundingGelb)) return { zustand: "ROT", signale };
  if (signale.length > 0) return { zustand: "GELB", signale };
  return { zustand: "GRUEN", signale };
}

export function berechneHebel(roh: Pick<BitcoinRohdaten, "fundingAktuell" | "hebelTage">, regel: HebelRegel = HEBEL_REGEL): HebelErgebnis & { verlauf: { datum: string; zustand: BitcoinZustand; oiUsd: number | null }[] } {
  const tage = roh.hebelTage.filter((t) => t.datum).sort((a, b) => a.datum.localeCompare(b.datum));
  const letzter = tage[tage.length - 1] ?? null;
  const vorher = tage[tage.length - 2] ?? null;
  const funding = roh.fundingAktuell?.rate ?? letzter?.funding ?? null;
  const oiUsd = letzter?.oiUsd ?? null;
  const oi24h = oiUsd !== null && vorher?.oiUsd ? oiUsd / vorher.oiUsd - 1 : null;
  const oiMax = Math.max(...tage.map((t) => t.oiUsd ?? 0));
  const oiVomHoch = oiUsd !== null && oiMax > 0 ? oiUsd / oiMax : null;
  const longShort = letzter?.longShort ?? null;
  const longShortVor7T = tage[tage.length - 8]?.longShort ?? null;
  const longQuote = longQuoteAusRatio(longShort);
  const { zustand, signale } = hebelZustand(funding, oi24h, longQuote, regel);

  // Verlauf je Tag, damit "seit" und das Band stimmen (Tagesmittel der Funding-Rate).
  const verlauf = tage.map((t, i) => {
    const prev = tage[i - 1];
    const dOi = t.oiUsd !== null && prev?.oiUsd ? t.oiUsd / prev.oiUsd - 1 : null;
    const z = i === tage.length - 1 ? zustand : hebelZustand(t.funding, dOi, longQuoteAusRatio(t.longShort), regel).zustand;
    return { datum: t.datum, zustand: z, oiUsd: t.oiUsd };
  });
  return { zustand, funding, oi24h, oiUsd, oiVomHoch, longQuote, longShort, longShortVor7T, signale, verlauf };
}

// ── Zone ───────────────────────────────────────────────────────────────

/** Tage seit dem Genesis-Block (UTC-Mitternacht). */
export function tageSeitGenesis(datum: string, regel: ZoneRegel = ZONE_REGEL): number {
  return Math.round((Date.parse(datum + "T00:00:00Z") - Date.parse(regel.genesis + "T00:00:00Z")) / 86_400_000);
}

/** Power-Law-Fit in USD für ein Datum "JJJJ-MM-TT". */
export function powerLawFit(datum: string, regel: ZoneRegel = ZONE_REGEL): number {
  const d = tageSeitGenesis(datum, regel);
  return d > 0 ? Math.pow(10, regel.alpha * Math.log10(d) + regel.c) : NaN;
}

export function zoneZustand(kursZuFit: number | null, regel: ZoneRegel = ZONE_REGEL): BitcoinZustand | null {
  if (kursZuFit === null || !isFinite(kursZuFit)) return null;
  if (kursZuFit >= regel.kanal) return "ROT";
  if (kursZuFit >= 1) return "GELB";
  return "GRUEN";
}

export interface ZoneErgebnis {
  zustand: BitcoinZustand | null;
  datum: string | null;
  kurs: number | null;
  fit: number | null;
  /** Kurs / Fit (0.61 = 39 % unter dem Fit). */
  kursZuFit: number | null;
  /** Untere Kanalgrenze (Fit / Kanalfaktor) — ab hier Kaufzone. */
  kaufzoneAb: number | null;
  /** Obere Kanalgrenze (Fit × Kanalfaktor) — ab hier Blasenzone. */
  blaseAb: number | null;
  /** Gleitender Schnitt (200 Tage) und Mayer Multiple. */
  sma: number | null;
  mayer: number | null;
  /** Fear & Greed heute / gestern. */
  fng: { wert: number; text: string } | null;
  fngGestern: { wert: number; text: string } | null;
  /** Abstand zum 1-Jahres-Hoch (−0.29 = 29 % darunter). */
  abstandJahreshoch: number | null;
  /** Monatlicher Verlauf der Zone (Monatsschluss), aufsteigend. */
  verlauf: { monat: string; zustand: BitcoinZustand; kursZuFit: number }[];
  /** Monat ("JJJJ-MM") des letzten Zonenwechsels. */
  seit: string | null;
}

export function berechneZone(roh: Pick<BitcoinRohdaten, "kurse" | "fng">, regel: ZoneRegel = ZONE_REGEL): ZoneErgebnis {
  const tage = Object.keys(roh.kurse).filter((d) => isFinite(roh.kurse[d]) && roh.kurse[d] > 0).sort();
  const leer: ZoneErgebnis = { zustand: null, datum: null, kurs: null, fit: null, kursZuFit: null, kaufzoneAb: null, blaseAb: null, sma: null, mayer: null, fng: null, fngGestern: null, abstandJahreshoch: null, verlauf: [], seit: null };
  if (tage.length === 0) return leer;

  const datum = tage[tage.length - 1];
  const kurs = roh.kurse[datum];
  const fit = powerLawFit(datum, regel);
  const kursZuFit = fit > 0 ? kurs / fit : null;
  const fenster = tage.slice(-regel.mayerTage);
  const sma = fenster.length >= regel.mayerTage ? fenster.reduce((s, d) => s + roh.kurse[d], 0) / fenster.length : null;
  const jahr = tage.slice(-366);
  const hoch = Math.max(...jahr.map((d) => roh.kurse[d]));

  // Monatsschluss-Verlauf: letzter Handelstag je Monat, laufender Monat mit dem letzten Kurs.
  const proMonat = new Map<string, string>();
  tage.forEach((d) => proMonat.set(d.slice(0, 7), d));
  const verlauf = Array.from(proMonat.entries()).map(([monat, d]) => {
    const q = roh.kurse[d] / powerLawFit(d, regel);
    return { monat, zustand: zoneZustand(q, regel) as BitcoinZustand, kursZuFit: q };
  }).slice(-36);
  let seit: string | null = null;
  for (let i = verlauf.length - 1; i >= 0; i--) {
    if (verlauf[i].zustand !== verlauf[verlauf.length - 1].zustand) break;
    seit = verlauf[i].monat;
  }

  const f = roh.fng ?? [];
  return {
    zustand: zoneZustand(kursZuFit, regel),
    datum, kurs, fit, kursZuFit,
    kaufzoneAb: fit / regel.kanal,
    blaseAb: fit * regel.kanal,
    sma, mayer: sma ? kurs / sma : null,
    fng: f[0] ? { wert: f[0].wert, text: f[0].text } : null,
    fngGestern: f[1] ? { wert: f[1].wert, text: f[1].text } : null,
    abstandJahreshoch: hoch > 0 ? kurs / hoch - 1 : null,
    verlauf, seit,
  };
}

/** Trendrichtung der Ampel über die letzten n Einträge eines Verlaufs. */
export function bitcoinTrend(verlauf: { zustand: BitcoinZustand }[], n: number): "good" | "flat" | "bad" | "none" {
  if (verlauf.length < n + 1) return "none";
  const jetzt = BITCOIN_RANG[verlauf[verlauf.length - 1].zustand];
  const vorher = BITCOIN_RANG[verlauf[verlauf.length - 1 - n].zustand];
  return jetzt < vorher ? "good" : jetzt > vorher ? "bad" : "flat";
}
