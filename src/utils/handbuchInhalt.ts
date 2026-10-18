/**
 * HANDBUCH-INHALT
 * ---------------
 * Der komplette Regelwerk-Text als DATEN statt als fest verdrahtetes JSX.
 *
 * Warum: Vorher stand alles als langer JSX-Fließtext in RegelwerkTab.tsx —
 * nicht durchsuchbar, nicht verlinkbar, auf dem Handy unbenutzbar. Als
 * Datenstruktur lässt sich der Inhalt filtern, aufklappen und per stabiler
 * ID direkt anspringen (Hilfe-Fragezeichen → passender Abschnitt).
 *
 * Die IDs sind STABIL — sie werden aus der App heraus verlinkt.
 * Beim Ändern einer ID die Verweise in HelpLink-Aufrufen mitziehen.
 */

export interface HandbuchPunkt {
  /** Fettgedruckter Kopf der Zeile (optional). */
  titel?: string;
  /** Fließtext. */
  text: string;
  /** Konkrete Handlungsanweisung (wird hervorgehoben). */
  regel?: string;
}

export interface HandbuchAbschnitt {
  /** STABILE ID — wird für Direktlinks genutzt. Nicht leichtfertig ändern. */
  id: string;
  /** Kurzer Titel für Inhaltsverzeichnis und Suchergebnis. */
  titel: string;
  /** Emoji als visueller Anker (schneller scanbar als Icons). */
  icon: string;
  /** Ein-Satz-Zusammenfassung, immer sichtbar. */
  kurz: string;
  /** Suchbegriffe, die nicht wörtlich im Text stehen. */
  schlagworte?: string[];
  punkte: HandbuchPunkt[];
}

export const HANDBUCH: HandbuchAbschnitt[] = [
  {
    id: "kaufampel",
    titel: "Kaufampel — wann gesperrt wird",
    icon: "🚦",
    kurz: "Sechs harte Schranken. Eine verletzt = keine Neukäufe.",
    schlagworte: ["vix", "vxv", "vvix", "contango", "backwardation", "wti", "öl", "gas", "distribution", "sperre", "ampel", "schranke"],
    punkte: [
      {
        titel: "VIX < 25",
        text: "Der Angstindex misst die erwartete Schwankung im S&P 500. Über 25 herrscht Stress — Kurse laufen dann nicht mehr nach Plan, sondern nach Panik.",
        regel: "VIX ≥ 25 → Kaufsperre",
      },
      {
        titel: "VIX/VXV-Ratio < 1,0 (Contango)",
        text: "VXV ist die 3-Monats-Erwartung. Ist die kurzfristige Angst (VIX) kleiner als die langfristige, ist der Markt ruhig — das nennt man Contango. Kippt das Verhältnis über 1,0 (Backwardation), erwartet der Markt kurzfristig mehr Ärger als langfristig: klassisches Krisensignal.",
        regel: "Ratio ≥ 1,0 → Kaufsperre",
      },
      {
        titel: "VVIX < 130",
        text: "Die Schwankung der Schwankung — misst, wie nervös der Optionsmarkt selbst ist. Zwischen 110 und 130 liegt die Warnzone: erhöhte Aufmerksamkeit, aber noch kein Stopp.",
        regel: "VVIX ≥ 130 → Kaufsperre · 110–130 → Warnzone",
      },
      {
        titel: "WTI Rohöl < 100 USD",
        text: "Hoher Ölpreis bedeutet Kostendruck für Unternehmen und Inflationsdruck für die Notenbank. Beides drückt Aktienbewertungen.",
        regel: "WTI ≥ 100 → Kaufsperre · zusätzlich Positionsgröße halbieren",
      },
      {
        titel: "Erdgas < 4,50 USD",
        text: "Gleiche Logik wie beim Öl, besonders relevant für europäische Industrie.",
        regel: "Gas ≥ 4,50 → Kaufsperre",
      },
      {
        titel: "Distribution Days < 5",
        text: "Ein Distribution Day ist ein Tag, an dem der Index spürbar fällt UND das Handelsvolumen höher ist als am Vortag. Das heißt: Große Institutionen verkaufen. Gezählt wird über ein rollierendes Fenster von etwa 4–5 Wochen. Es zählt der höhere Wert aus S&P 500 und Nasdaq — der Nasdaq warnt oft früher.",
        regel: "max(SPX, NDX) ≥ 5 → Kaufsperre",
      },
    ],
  },
  {
    id: "dist-quelle",
    titel: "Distribution Days — Quellenregel",
    icon: "🔍",
    kurz: "Nur belastbare Daten sperren hart. Schätzwerte warnen nur.",
    schlagworte: ["quelle", "source", "yahoo", "manual", "ai", "estimate", "schätzwert", "fallback", "warnung", "gelb"],
    punkte: [
      {
        titel: "Warum das wichtig ist",
        text: "Distribution Days lassen sich nicht immer zuverlässig abrufen. Die App holt sie zuerst von Yahoo; klappt das nicht, schätzt eine KI oder es greift ein fester Fallback-Wert. Eine Kaufsperre auf Basis eines geratenen Werts wäre keine Disziplin, sondern Zufall.",
      },
      {
        titel: "Belastbar: yahoo oder manual",
        text: "Der Wert stammt aus echten Marktdaten oder wurde von dir selbst eingetragen.",
        regel: "≥ 5 → harte Kaufsperre",
      },
      {
        titel: "Fallback: ai oder estimate",
        text: "Der Wert ist geschätzt. Er wird angezeigt und warnt dich, sperrt aber nicht.",
        regel: "≥ 5 → nur gelbe Warnung, kein Kaufverbot",
      },
      {
        titel: "Konsequenz für die Tagesampel",
        text: "Ein Tag kann trotz hoher Distribution Days GRÜN sein, wenn die Quelle nur geschätzt war. Das ist kein Fehler, sondern gewollt — die Wochenanalyse weist die Quelle deshalb immer mit aus.",
      },
    ],
  },
  {
    id: "position-sizing",
    titel: "Positionsgröße — die 1%-Regel",
    icon: "📐",
    kurz: "Pro Trade nie mehr als 1 % des Kapitals riskieren.",
    schlagworte: ["risiko", "sizing", "tranche", "1%", "kapital", "größe", "halbieren"],
    punkte: [
      {
        titel: "Die Grundregel",
        text: "Riskiert wird pro Trade maximal 1 % des Gesamtkapitals. Wichtig: Das ist der Betrag, den du bei Auslösen des Stops verlierst — nicht die Positionsgröße. Bei 100.000 € Kapital sind das 1.000 € Risiko, was bei 10 € Stop-Abstand 100 Stück bedeutet.",
        regel: "Risiko pro Trade ≤ 1 % des Kapitals",
      },
      {
        titel: "Ölklausel",
        text: "Bei WTI ab 100 USD wird das Risiko halbiert, weil die Marktbedingungen unzuverlässiger werden.",
        regel: "WTI ≥ 100 → nur noch 0,5 % Risiko",
      },
      {
        titel: "Warum konstant",
        text: "Nach einer Gewinnserie will das Ego erhöhen, nach Verlusten will es aufholen. Beides ist derselbe Fehler. Die Tranchengröße bleibt gleich — eine Serie ist statistisches Rauschen, keine Kompetenz.",
      },
    ],
  },
  {
    id: "stop-loss",
    titel: "Stop-Loss — der harte Anker",
    icon: "🛑",
    kurz: "max(harter Anker, Kurs − 2×ATR). Niemals nach unten verschieben.",
    schlagworte: ["stop", "atr", "anker", "exit", "verlust", "gtc", "verschieben"],
    punkte: [
      {
        titel: "Die Formel",
        text: "Der Stop liegt beim höheren der beiden Werte: deinem festgelegten harten Anker oder dem aktuellen Kurs minus dem Doppelten der durchschnittlichen Tagesschwankung (ATR). Der ATR-Anteil sorgt dafür, dass normales Rauschen dich nicht ausstoppt.",
        regel: "Stop = max(harter Anker, Kurs − 2 × ATR)",
      },
      {
        titel: "Die unverhandelbare Regel",
        text: "Der Stop wird beim Kauf sofort als GTC-Order platziert und niemals nach unten verschoben. Nach oben nachziehen ist erlaubt und erwünscht.",
        regel: "Stop nie abwärts verschieben — ohne Ausnahme",
      },
      {
        titel: "Warum das so hart ist",
        text: "Verlustaversion ist der stärkste Denkfehler: Ein Verlust schmerzt etwa doppelt so stark, wie ein gleich großer Gewinn freut. Genau deshalb wird der Stop 'nur noch ein bisschen' verschoben — und aus einem geplanten kleinen Verlust wird ein ungeplanter großer.",
      },
    ],
  },
  {
    id: "handelszeiten",
    titel: "Handelszeiten — Österreich-Klausel",
    icon: "⏱️",
    kurz: "Vor 15:30 nicht handeln — die Spreads fressen dich auf.",
    schlagworte: ["zeit", "uhrzeit", "spread", "verbotene zone", "new york", "eröffnung", "österreich"],
    punkte: [
      {
        titel: "Verbotene Zone: 09:00 – 15:30",
        text: "New York schläft noch. Europäische Zukäufe leiden unter weiten Geld-Brief-Spannen — du zahlst spürbar mehr, als der Titel wert ist.",
        regel: "Vor 15:30 keine Käufe",
      },
      {
        titel: "Eröffnungs-Turbulenz: 15:30 – 16:00",
        text: "Die ersten Minuten nach US-Eröffnung sind Lärm. Kurse springen ohne Aussagekraft.",
        regel: "Erste halbe Stunde abwarten",
      },
      {
        titel: "Fenster: ab 16:00",
        text: "Ab jetzt sind Liquidität und Spreads brauchbar. Das ist dein Handelsfenster.",
      },
    ],
  },
  {
    id: "steuern",
    titel: "Steuern — österreichische KESt",
    icon: "🇦🇹",
    kurz: "27,5 % auf Gewinne. Verlustausgleich pro Depot.",
    schlagworte: ["kest", "steuer", "27,5", "verlustausgleich", "fifo", "durchschnitt", "coinfinity", "steuereinfach", "krypto"],
    punkte: [
      {
        titel: "Der Satz",
        text: "Auf realisierte Kursgewinne fallen in Österreich 27,5 % Kapitalertragsteuer an. Das gilt seit 2022 auch für Krypto.",
        regel: "KESt = 27,5 % auf den Gewinn",
      },
      {
        titel: "Verlustausgleich",
        text: "Gewinne und Verluste werden gegeneinander verrechnet — beim steuereinfachen Broker automatisch, aber nur innerhalb desselben Depots und Kalenderjahres. Depotübergreifend geht es nur über die Steuererklärung mit Verlustausgleichsbescheinigung.",
        regel: "Ausgleich pro Depot, nicht depotübergreifend",
      },
      {
        titel: "Berechnungsmethode",
        text: "Österreich schreibt den gleitenden Durchschnittspreis vor, Deutschland arbeitet mit FIFO (First In, First Out). Der Unterschied wirkt sich nur beim Teilverkauf aus — bei einer ganzen Position ist das Ergebnis identisch.",
        regel: "Österreich: gleitender Durchschnitt",
      },
      {
        titel: "Nicht steuereinfache Broker",
        text: "Coinfinity behält die KESt nicht automatisch ein. Der Gewinn muss selbst über die Steuererklärung erklärt und die Steuer abgeführt werden. DADAT und Flatex.at erledigen das automatisch.",
        regel: "Coinfinity → KESt selbst erklären",
      },
    ],
  },
  {
    id: "blasen-ampel",
    titel: "Blasen-Ampel — Sektoren mit Rückschlagrisiko",
    icon: "🫧",
    kurz: "Verdoppelt sich ein Sektor in 2 Jahren, crasht danach jeder zweite. Risiko drosseln, nicht shorten.",
    schlagworte: ["blase", "bubble", "sektor", "etf", "halbleiter", "harvard", "fama", "greenwood", "shleifer", "run-up", "trendfilter", "sma", "gelb", "rot"],
    punkte: [
      {
        titel: "Woher die Regel kommt",
        text: "Harvard-Studie „Bubbles for Fama“ (Greenwood, Shleifer & You, 2019): 49 US-Branchen 1926–2014 plus 31 Länder. Steigt eine Branche in zwei Jahren um mehr als 100 %, absolut und relativ zum Markt, fällt sie in 53 % der Fälle innerhalb der nächsten zwei Jahre um mindestens 40 %. Ab 150 % Anstieg sind es 80 %. Die Studie gilt für Branchen — bei Einzelaktien kommt das Monatssignal oft erst nach dem Hoch.",
      },
      {
        titel: "Gelb — Blasen-Signal",
        text: "2-Jahres-Anstieg ≥ 100 % absolut und ≥ 100 % über dem S&P 500, 5-Jahres-Rendite ≥ 50 % (keine Erholungs-Rally), Kurs höchstens 25 % unter dem 2-Jahres-Hoch. Das Signal gilt 24 Monate.",
        regel: "Gelb → Risikobudget im Sektor halbieren, keine neuen Hebelpositionen, Stopps nachziehen. Kein Short.",
      },
      {
        titel: "Rot — Trendbruch",
        text: "Gelb und der Monatsschluss liegt unter dem 10-Monats-Durchschnitt. Im Backtest (42 Branchen-Episoden 1926–2018, 44 ETF-Episoden 1996–2026) gab es mit diesem Filter keinen einzigen Fall unter −40 %; ohne Filter in jedem fünften Fall.",
        regel: "Rot → Exposure im Sektor stark reduzieren, Wiedereinstieg erst nach Monatsschluss über dem Durchschnitt.",
      },
      {
        titel: "Warum nicht sofort verkaufen",
        text: "Nach dem Gelb-Signal stiegen die Kurse im Schnitt noch 5–6 Monate und 25–60 % weiter. Nicht-Crash-Fälle legten in zwei Jahren +44 % zu. Wer beim Signal aussteigt, verpasst das. Die Ampel steuert Größe und Stopps, nicht das Timing.",
        regel: "Die Ampel sperrt nichts — die Kaufsperre kommt nur aus den Kaufschranken.",
      },
      {
        titel: "Zurücksetzen",
        text: "Fällt ein Sektor 40 % unter sein 2-Jahres-Hoch, ist der Crash eingetreten. Das Fenster endet, die Ampel springt auf Grün. Vorsicht: Signale verfallen nicht nach zwei Jahren von selbst — Nikkei 1987 oder Energie 2005 crashten erst im dritten Jahr.",
      },
      {
        titel: "Daten",
        text: "Bereinigte Monatsschlusskurse der Sektor-ETFs von Yahoo (10 Jahre), Benchmark SPY. Der laufende Monat zählt erst nach Monatsende. Es sind bewusst Sektor-ETFs und Indizes, keine Einzelaktien.",
      },
    ],
  },
  {
    id: "bitcoin-kurzfrist",
    titel: "Bitcoin-Kurzfrist — Hebel und Zone beim Power-Law-Hold",
    icon: "₿",
    kurz: "Zwei Tageszeilen für Bitcoin: Ist der Perp-Markt überladen (Hebel)? Wo steht der Kurs im Power-Law-Kanal (Zone)? Steuert Nachkauf und Stopps, sperrt nichts.",
    schlagworte: ["bitcoin", "btc", "krypto", "power law", "powerlaw", "funding", "open interest", "perp", "perpetual", "hebel", "liquidation", "flash crash", "mayer", "fear and greed", "okx", "zone", "kaufzone"],
    punkte: [
      {
        titel: "Warum zwei Zeilen",
        text: "Die Blasen-Ampel rechnet mit Monatsschlusskursen — bei Bitcoin kommt ihr Signal oft erst nach dem Hoch. Die Flash-Crashs vom 10.10.2025 (−14 % in Stunden, 19 Mrd USD Liquidationen) und vom 17./18.10.2026 entstanden nicht aus der Bewertung, sondern aus überladenen Hebelpositionen. Deshalb fragt „Hebel“ nach dem Perp-Markt und „Zone“ nach der Bewertung im Langfristtrend. Beide gehören zum Power-Law-Hold: Der Kern bleibt liegen, die Zeilen steuern nur, wie schnell nachgekauft wird und wie eng die Stopps für kurzfristige Positionen sind.",
      },
      {
        titel: "Hebel — Funding, Open Interest, Long-Quote",
        text: "Ewige Futures (Perps) gleichen Perp- und Spotkurs über die Funding-Rate aus: Steht der Perp über Spot, zahlen Longs alle 8 Stunden an Shorts. 0,01 % je 8 h ist der Normalwert (≈ 11 % p. a.). Ab 0,03 % drängen sich Longs, ab 0,06 % ist der Markt heiß — vor dem 10.10.2025 lag Funding bei 0,05–0,10 %. Open Interest ist das offene Hebelkapital; ein Sprung von 8 % in 24 h heißt, frisches Hebelgeld ist drin, das bei einem Rutsch zwangsliquidiert wird und ihn verstärkt (Liquidationskaskade). Die Long-Quote zählt Konten, nicht Kapital, und schwankt stark — erst ab 70 % Long gilt die Seite als überfüllt.",
        regel: "Gelb (ein Signal) → Nachkauf halbieren, Stopps enger, keine eigenen Perps. Rot (Funding ≥ 0,06 % oder OI-Sprung plus Funding ≥ 0,03 %) → kein Nachkauf, Rücksetzer von 10–20 % einplanen.",
      },
      {
        titel: "Zone — Power-Law-Kanal",
        text: "Bitcoin folgt seit 2010 einem Potenzgesetz: log10 Kurs = 5,64 · log10 Tage seit Genesis + c. Das erklärt 96 % der Kursvarianz und schlägt auf 12–24 Monate alle anderen Modelle (Stock-to-Flow, Metcalfe, Halving-Zyklen); auf 1–3 Monate ist nichts besser als der Zufall. Der Kanal ist Faktor 2 nach oben und unten (eine Standardabweichung der Abweichungen). Unter dem Fit: 2015, 2016, 2022/23, seit November 2025. Über dem doppelten Fit: 2017/18 (bis 7×) und 2021 (3,2×), jedes Mal vor einem Minus von 70–80 %. Der Fit steigt rund 30 % pro Jahr — die Zonen wandern mit. Nebenwerte: Mayer Multiple (Kurs / 200-Tage-Schnitt; unter 0,8 günstig, über 2,4 überhitzt) und Fear & Greed (unter 25 bestätigt die Kaufzone, über 75 die Blasenzone).",
        regel: "Grün (unter 1× Fit) → Rücksetzer sind Gelegenheiten, unter 0,5× Fit Nachkauf verdoppeln. Gelb (1–2× Fit) → Nachkauf nach Plan, keine Hebel. Rot (ab 2× Fit) → Nachkauf stoppen, Teilverkäufe nach Plan.",
      },
      {
        titel: "Was die Zeilen nicht können",
        text: "Sie sagen nicht, wann es dreht. Kurzfristige Bitcoin-Prognosen aus Netzwerkdaten (Hashrate, Transaktionen, Adressen) haben in Tests außerhalb der Stichprobe keine Vorhersagekraft. Die Zeilen sagen nur, wie groß ein Rutsch werden kann (Hebel) und ob er eine Gelegenheit ist (Zone). Beide sperren nichts — die Kaufsperre kommt ausschließlich aus den Kaufschranken.",
      },
      {
        titel: "Daten",
        text: "Perp-Daten von OKX (BTC-USDT-SWAP: Funding-Rate aktuell und Historie, Open Interest und Long/Short-Konten je Tag, 30 Tage). Binance und Bybit blockieren Server in den USA, OKX trägt rund 10 % des Perp-Volumens und läuft parallel zu den großen Börsen. Fear & Greed von alternative.me. Tagesschlusskurse BTC-USD von Yahoo (3 Jahre) für Fit, 200-Tage-Schnitt und den 36-Monats-Verlauf. Power-Law-Achsenabschnitt c auf Coinbase-Tagesdaten 2014–2026 (FRED CBBTCUSD) mit festem α = 5,64 gelegt. Server-Cache 30 Minuten, Aktualisieren-Knopf lädt neu.",
      },
      {
        titel: "Quellen",
        text: "Power Law: „A Power Law for Bitcoin“, arXiv 2605.21316 (2026) — α ≈ 5,64, R² 0,96, Residuen-Streuung ≈ Faktor 2. Kurzfrist-Rauschen: arXiv 2606.00071 (2026) — Netzwerkmetriken ohne Vorhersagekraft außerhalb der Stichprobe. Carry und Crashs: BIS Working Paper 1087 „Crypto carry“ (2023) — hohe Funding-Phasen liegen systematisch vor Crashs, getrieben von Hebel-Kleinanlegern. Mayer Multiple: Trace Mayer, 2017. Fear & Greed: alternative.me/crypto/fear-and-greed-index. OKX-API: okx.com/docs-v5 (public/funding-rate, rubik/stat/contracts). Liquidationskaskaden: Nachberichte zum 10.10.2025 (CoinGlass, 19 Mrd USD Liquidationen in 24 h).",
      },
    ],
  },
  {
    id: "denkfehler",
    titel: "Die 7 Denkfehler (René Berteit)",
    icon: "🧠",
    kurz: "Der Markt ist nicht dein Gegner — dein Ego ist es.",
    schlagworte: ["psychologie", "bias", "fomo", "gier", "angst", "ego", "berteit", "rene", "disziplin"],
    punkte: [
      {
        titel: "1. Bestätigungsfehler",
        text: "Du suchst so lange, bis du Argumente für deinen Wunschtrade findest. Gegenargumente blendest du aus.",
        regel: "Bear Case formulieren — nicht widerlegbar? Kein Trade.",
      },
      {
        titel: "2. Verlustaversion",
        text: "Ein Verlust schmerzt doppelt so stark wie ein gleich großer Gewinn freut. Folge: Der Stop wird heimlich nachgegeben.",
        regel: "GTC-Stop beim Kauf setzen, nie abwärts verschieben",
      },
      {
        titel: "3. FOMO",
        text: "Eine Aktie rennt ohne dich davon, du kaufst im Hoch — und triffst die Erschöpfung.",
        regel: "Nur am Limit kaufen, nie beim Spitzenkurs",
      },
      {
        titel: "4. Rache-Trading",
        text: "Nach einem Verlust willst du ihn sofort zurückholen und erhöhst das Risiko.",
        regel: "1 %-Regel gilt auch in schlechten Wochen",
      },
      {
        titel: "5. Selbstüberschätzung",
        text: "Nach einer Gewinnserie glaubst du, den Markt zu lesen — und gibst die Serie zurück.",
        regel: "Tranchengröße bleibt konstant",
      },
      {
        titel: "6. Kontrollillusion",
        text: "Mehr Indikatoren, mehr News, mehr Linien — in der Hoffnung auf Kontrolle. Tatsächlich sinkt die Klarheit.",
        regel: "Wenige harte Werkzeuge: Volatilität, Energie, Anker",
      },
      {
        titel: "7. Planlosigkeit",
        text: "Du entscheidest spontan, ohne vorher Einstieg, Stop und Ziel zu definieren. Jede Entscheidung wird emotional.",
        regel: "Plan vor dem Trade, Journal pflicht",
      },
    ],
  },
  {
    id: "disziplin",
    titel: "Disziplin-Quote",
    icon: "🎯",
    kurz: "Ziel: mindestens 95 % regelkonforme Entscheidungen.",
    schlagworte: ["quote", "disziplin", "95", "regelbruch", "journal"],
    punkte: [
      {
        titel: "Was gemessen wird",
        text: "Nicht ob ein Trade Gewinn brachte, sondern ob er nach Plan ausgeführt wurde. Ein regelkonformer Verlusttrade ist ein guter Trade. Ein regelwidriger Gewinntrade ist ein schlechter.",
        regel: "Ziel ≥ 95 %",
      },
      {
        titel: "Warum Prozess vor Ergebnis",
        text: "Über Einzeltrades entscheidet der Zufall. Über hunderte Trades entscheidet, ob du deine Regeln eingehalten hast. Nur das ist steuerbar.",
      },
    ],
  },
];

/** Durchsucht Titel, Kurztext, Schlagworte und alle Punkte. */
export function handbuchSuchen(query: string): HandbuchAbschnitt[] {
  const q = query.trim().toLowerCase();
  if (!q) return HANDBUCH;
  return HANDBUCH.filter((a) => {
    const heuhaufen = [
      a.titel,
      a.kurz,
      ...(a.schlagworte ?? []),
      ...a.punkte.flatMap((p) => [p.titel ?? "", p.text, p.regel ?? ""]),
    ]
      .join(" ")
      .toLowerCase();
    return heuhaufen.includes(q);
  });
}
