/**
 * IMPORT-PARSER FÜR TABELLEN (Excel-Zwischenablage)
 * -------------------------------------------------
 * Einzige Stelle, die aus eingefügtem Rohtext Kauf-Zeilen macht.
 *
 * Regel pro Zeile: erste DATUMS-Zelle finden, danach die ersten zwei
 * ZAHLEN = Stück und Kurs. Alles andere wird ignoriert — dadurch spielt
 * es keine Rolle, ob vorne eine leere Nummernspalte steht, ob hinten
 * Verkaufsspalten folgen oder ob eine Summenzeile ("Verkauft") dabei ist.
 *
 * Gebühren (optional): nur, wenn eine Kopfzeile eine Spalte mit
 * "Gebühr", "Spesen" oder "Fee" ausweist. Ohne Kopfzeile keine Gebühren.
 *
 * Datumsformate: 21/2/2023 · 21.02.2023 · 2023-02-21 · 21-02-2023
 * Zahlenformate: 1.234,56 · 180,50 · 180.50 · 1234.56
 *   (ein einzelner Punkt mit genau drei Nachstellen = Tausenderpunkt,
 *    z.B. "1.000" → 1000; "180.50" → 180,5)
 */

export interface ImportZeile {
  /** 1-basierte Zeilennummer im eingefügten Text. */
  nr: number;
  roh: string;
  datum: string | null;      // ISO yyyy-mm-dd
  stueck: number | null;
  kurs: number | null;
  gebuehren: number | null;
  /** null = gültig; sonst der Grund, warum die Zeile nicht importierbar ist. */
  fehler: string | null;
}

export interface ImportErgebnis {
  zeilen: ImportZeile[];
  gueltig: ImportZeile[];
  /** Spaltenindex der erkannten Gebührenspalte, sonst null. */
  gebuehrenSpalte: number | null;
}

/** Wandelt ein Datum in ISO um; null, wenn die Zelle kein Datum ist. */
export function parseDatum(zelle: string): string | null {
  const s = zelle.trim();
  let t: number | null = null, m: number | null = null, j: number | null = null;

  let hit = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (hit) { t = +hit[1]; m = +hit[2]; j = +hit[3]; }
  else {
    hit = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (hit) { j = +hit[1]; m = +hit[2]; t = +hit[3]; }
  }
  if (t === null || m === null || j === null) return null;
  if (m < 1 || m > 12 || t < 1 || t > 31 || j < 1990 || j > 2100) return null;
  const d = new Date(Date.UTC(j, m - 1, t));
  if (d.getUTCMonth() !== m - 1 || d.getUTCDate() !== t) return null; // z.B. 31.02.
  return `${j}-${String(m).padStart(2, "0")}-${String(t).padStart(2, "0")}`;
}

/** Wandelt deutsche/englische Zahlenschreibweisen um; null, wenn keine Zahl. */
export function parseZahl(zelle: string): number | null {
  let s = zelle.trim().replace(/[€$\s]/g, "");
  if (!s || !/^[-+]?[\d.,]+$/.test(s)) return null;

  const hatKomma = s.includes(",");
  const hatPunkt = s.includes(".");
  if (hatKomma && hatPunkt) {
    // Das letzte Trennzeichen ist das Dezimalzeichen.
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (hatKomma) {
    s = s.replace(",", ".");
  } else if (hatPunkt) {
    // Einzelner Punkt mit genau drei Nachstellen = Tausenderpunkt ("1.000").
    const teile = s.split(".");
    if (teile.length === 2 && teile[1].length === 3) s = teile.join("");
    else if (teile.length > 2) s = teile.join("");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** Zerlegt eine Zeile in Zellen: Tabulator bevorzugt, sonst Semikolon, sonst 2+ Leerzeichen. */
function zellen(zeile: string): string[] {
  if (zeile.includes("\t")) return zeile.split("\t");
  if (zeile.includes(";")) return zeile.split(";");
  return zeile.trim().split(/\s{2,}/);
}

function istGebuehrenKopf(zelle: string): boolean {
  const s = zelle.toLowerCase();
  return s.includes("gebühr") || s.includes("gebuehr") || s.includes("spesen") || s.includes("fee");
}

export function parseTabelle(text: string): ImportErgebnis {
  const roheZeilen = text.replace(/\r/g, "").split("\n");
  const zeilenErg: ImportZeile[] = [];
  let gebuehrenSpalte: number | null = null;

  roheZeilen.forEach((roh, i) => {
    const nr = i + 1;
    if (!roh.trim()) return; // Leerzeilen still ignorieren

    const z = zellen(roh);

    // Kopfzeile: kein Datum, aber Buchstaben → Gebührenspalte suchen, Zeile überspringen.
    const hatDatum = z.some((c) => parseDatum(c) !== null);
    if (!hatDatum) {
      const kopfIdx = z.findIndex(istGebuehrenKopf);
      if (kopfIdx >= 0 && gebuehrenSpalte === null) gebuehrenSpalte = kopfIdx;
      zeilenErg.push({ nr, roh, datum: null, stueck: null, kurs: null, gebuehren: null, fehler: "kein Datum — übersprungen" });
      return;
    }

    const datumIdx = z.findIndex((c) => parseDatum(c) !== null);
    const datum = parseDatum(z[datumIdx]);

    // Schutz vor Summen-/Verkaufszeilen: Vor dem Kaufdatum darf höchstens
    // eine Zahl stehen (laufende Nummer) und kein Text ("Verkauft", …).
    const vorDatum = z.slice(0, datumIdx).map((c) => c.trim()).filter((c) => c !== "");
    const textVorDatum = vorDatum.some((c) => parseZahl(c) === null);
    const zahlenVorDatum = vorDatum.filter((c) => parseZahl(c) !== null).length;
    if (textVorDatum || zahlenVorDatum > 1) {
      zeilenErg.push({ nr, roh, datum, stueck: null, kurs: null, gebuehren: null, fehler: "Summen-/Verkaufszeile — übersprungen" });
      return;
    }

    // Ab der Datumszelle die ersten zwei Zahlen: Stück, Kurs.
    const zahlen: number[] = [];
    for (let k = datumIdx + 1; k < z.length && zahlen.length < 2; k++) {
      const n = parseZahl(z[k]);
      if (n !== null) zahlen.push(n);
    }
    const stueck = zahlen[0] ?? null;
    const kurs = zahlen[1] ?? null;

    let gebuehren: number | null = null;
    if (gebuehrenSpalte !== null && z[gebuehrenSpalte] !== undefined) {
      const g = parseZahl(z[gebuehrenSpalte]);
      if (g !== null && g > 0) gebuehren = g;
    }

    let fehler: string | null = null;
    if (stueck === null || kurs === null) fehler = "Stück oder Kurs fehlt";
    else if (!(stueck > 0)) fehler = "Stückzahl muss > 0 sein";
    else if (!(kurs > 0)) fehler = "Kurs muss > 0 sein";

    zeilenErg.push({ nr, roh, datum, stueck, kurs, gebuehren, fehler });
  });

  return {
    zeilen: zeilenErg,
    gueltig: zeilenErg.filter((r) => r.fehler === null),
    gebuehrenSpalte,
  };
}

/**
 * Feste, aus dem Inhalt abgeleitete Import-ID. Gleiche Zeile → gleiche ID,
 * damit ein zweites Einfügen derselben Tabelle nichts doppelt anlegt.
 * laufNr unterscheidet echte Teilausführungen (gleicher Tag, Kurs, Stück)
 * innerhalb eines Einfügens: #1, #2, #3 …
 */
export function importId(
  key: string, depot: string, besitzer: string,
  datumIso: string, kurs: number, stueck: number, laufNr: number
): string {
  const basis = `${depot.trim().toLowerCase()}|${besitzer.trim().toLowerCase()}|${kurs}|${stueck}`;
  let h = 5381;
  for (let i = 0; i < basis.length; i++) h = ((h << 5) + h + basis.charCodeAt(i)) >>> 0;
  return `imp_${key}_${datumIso.replace(/-/g, "")}_${h.toString(36)}_${laufNr}`;
}
