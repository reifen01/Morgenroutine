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
