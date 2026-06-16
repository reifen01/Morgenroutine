/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { 
  GraduationCap, 
  ShieldAlert, 
  Clock, 
  Percent, 
  FileText, 
  Coins,
  Compass,
  MessageSquare
} from "lucide-react";
import AICoachTab from "./AICoachTab";

interface RegelwerkTabProps {
  routineDate: string;
}

export default function RegelwerkTab({ routineDate }: RegelwerkTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<"regeln" | "coach">("regeln");

  return (
    <div className="space-y-6">
      {/* Sleek Sub-Tab Switcher */}
      <div className="flex bg-slate-200/60 p-1 rounded-2xl max-w-sm mx-auto shadow-inner border border-slate-300/10">
        <button
          type="button"
          onClick={() => setActiveSubTab("regeln")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs sm:text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === "regeln"
              ? "bg-white text-slate-800 shadow-sm"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <GraduationCap className="h-4 w-4" />
          Handels-Regeln
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("coach")}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs sm:text-xs font-bold transition-all cursor-pointer ${
            activeSubTab === "coach"
              ? "bg-white text-slate-800 shadow-sm"
              : "text-slate-500 hover:text-slate-800"
          }`}
        >
          <MessageSquare className="h-4 w-4" />
          AI-Handels-Coach
        </button>
      </div>

      {activeSubTab === "regeln" ? (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 space-y-8 shadow-md shadow-slate-200/5 text-slate-900 animate-fade-in text-left">
      
      {/* Tab Header block */}
      <div className="border-b border-slate-50 pb-4">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2 font-display">
          <GraduationCap className="h-5 w-5 text-slate-800" />
          Master-Regelwerk (Unbestechliche Handelsbestimmungen)
        </h2>
        <p className="text-xs text-slate-400 font-semibold mt-1">
          Operatives Regelwerk inklusive Marktzeiten &amp; der Rene-Psychologie nach "Master Your Trade"
        </p>
      </div>

      {/* Die 7 größten Denkfehler (Rene's PDF) */}
      <div className="bg-slate-50/20 border border-slate-100/70 rounded-2xl p-5 sm:p-6 space-y-4">
        <h3 className="text-sm sm:text-base font-bold text-slate-950 flex items-center gap-1.5 font-display">
          <ShieldAlert className="h-4.5 w-4.5 text-slate-800" />
          🧠 Die 7 größten Denkfehler von Tradern (René Berteit)
        </h3>
        <p className="text-xs text-slate-900/80 font-medium leading-relaxed">
          René Berteits Kernthese: <strong>der Markt ist nicht dein Gegner, dein Ego ist es.</strong> Erfolgreiche Trader gewinnen
          nicht durch bessere Prognosen, sondern durch <strong>strikte Regeln, mit denen sie sich selbst aushebeln</strong>, bevor
          Emotionen das Steuer übernehmen. Unsere Morgenroutine setzt diese Logik mechanisch um. Die folgenden sieben
          Denkfehler sind die häufigsten Hebel, mit denen der Markt Kapital aus undisziplinierten Portfolios herauszieht:
        </p>

        <ul className="space-y-3 text-xs sm:text-sm text-slate-800 list-disc list-inside pl-1 font-medium leading-relaxed">
          <li>
            <strong className="text-slate-900">1. Bestätigungsfehler (Confirmation Bias):</strong> Du suchst Nachrichten und Charts so lange,
            bis du Argumente für deinen Wunschtrade findest. Gegenargumente werden ausgeblendet.
            🚨 <em className="text-rose-700">Lösung: Im Rechner-Tab stur einen Bear Case formulieren — wenn er nicht widerlegbar ist, fällt der Trade aus.</em>
          </li>
          <li>
            <strong className="text-slate-900">2. Verlustaversion (Loss Aversion):</strong> Ein Verlust schmerzt etwa doppelt so stark
            wie ein gleich großer Gewinn freut. Folge: Stops werden heimlich nach unten verschoben („nur noch ein paar Cent…").
            🚨 <em className="text-rose-700">Lösung: GTC-Stop sofort beim Kauf platzieren, niemals abwärts verschieben. Punkt.</em>
          </li>
          <li>
            <strong className="text-slate-900">3. FOMO (Fear of Missing Out, Gier nach schnellem Geld):</strong> Eine Aktie rennt ohne dich davon,
            also kaufst du im Hoch — und triffst genau die Erschöpfung.
            🚨 <em className="text-rose-700">Lösung: Käufe ausschließlich beim mathematischen Limit, niemals beim Spitzenkurs. Wenn das Limit nicht trifft, kein Trade.</em>
          </li>
          <li>
            <strong className="text-slate-900">4. Rache-Trading (Revenge Trading):</strong> Nach einem Verlust willst du ihn sofort zurückgewinnen,
            erhöhst Positionsgröße oder gehst Risiken ein, die du nüchtern nie eingegangen wärst.
            🚨 <em className="text-rose-700">Lösung: 1%-Risikoregel pro Trade ist nicht verhandelbar. Eine schlechte Woche ändert die Tranchengröße nicht.</em>
          </li>
          <li>
            <strong className="text-slate-900">5. Selbstüberschätzung (Overconfidence):</strong> Nach einer Gewinnserie glaubst du, den Markt
            zu „lesen". Du erhöhst die Größe, wirst sorglos — und gibst die ganze Serie zurück.
            🚨 <em className="text-rose-700">Lösung: Tranchengröße bleibt konstant, Gewinnsträhne ist statistisches Rauschen, nicht Kompetenz.</em>
          </li>
          <li>
            <strong className="text-slate-900">6. Kontrollillusion (Illusion of Control):</strong> Mehr Indikatoren, mehr Newsticker, mehr Linien —
            in der Hoffnung, mehr Kontrolle zu haben. Tatsächlich sinkt nur die Klarheit.
            🚨 <em className="text-rose-700">Lösung: Reduziere auf wenige, harte Werkzeuge. Volatilitäts-Trio (VIX/VXV/VVIX) + Energie + harter Anker reichen.</em>
          </li>
          <li>
            <strong className="text-slate-900">7. Planlosigkeit (No Plan, No Edge):</strong> Du entscheidest spontan, ohne vorher zu definieren,
            wann du kaufst, verkaufst, abbrichst. Jede Entscheidung wird emotional.
            🚨 <em className="text-rose-700">Lösung: Plan vor dem Trade — Einstieg, Stop, Ziel, Risiko-Betrag. Sonst kein Trade. Journal pflichtmäßig führen.</em>
          </li>
        </ul>

        <div className="bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-700 leading-relaxed">
          <strong className="text-slate-900">Bertelts Kern-Empfehlung:</strong> „Du brauchst kein besseres System als der Markt — du brauchst ein System,
          das dich selbst vor deinem schlechtesten Tag schützt." Die unbestechliche Morgenroutine macht genau das mechanisch.
        </div>
      </div>

      {/* Section 2: US-Handelszeiten & Taktisches Timing */}
      <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-5 sm:p-6 space-y-4">
        <h3 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5 font-display uppercase tracking-widest">
          <Clock className="h-4.5 w-4.5 text-slate-800" />
          ⏱️ US-Handelszeiten &amp; Taktisches Timing (Österreich-Klausel)
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs sm:text-sm">
          <div className="p-4 bg-white border border-slate-100 rounded-xl space-y-1.5 shadow-sm">
            <span className="font-bold text-rose-700 block text-xs sm:text-sm uppercase tracking-wide">
              3.1 Die Verbotene Zone (09:00 - 15:30)
            </span>
            <p className="text-slate-655 text-xs font-medium leading-relaxed font-sans">
              Die Heimatbörse New York schläft noch. Europäische Retail-Zukäufe leiden unter massiv weiten <strong>Geld-Brief-Spannen (Spreads)</strong>. 
              Du bezahlst unbewusst 1-2% Aufpreis. 
              <br/><strong className="text-rose-600">Systemregel: Keine Käufe am europäischen Vormittag!</strong>
            </p>
          </div>
          
          <div className="p-4 bg-white border border-slate-100 rounded-xl space-y-1.5 shadow-sm">
            <span className="font-bold text-amber-700 block text-xs sm:text-sm uppercase tracking-wide">
              3.2 Die Todeszone (15:30 - 16:00)
            </span>
            <p className="text-slate-655 text-xs font-medium leading-relaxed font-sans">
              Der <strong>Opening Flush</strong>. Institutionelle Algorithmen jagen rücksichtslos die Stopps der ungeduldigen Kleinanleger. Heftige Fehlausbrüche ("Whipsaws") drohen.
              <br/><strong className="text-amber-600">Systemregel: Strikte Inaktivität! Nur beobachten, niemals eingreifen!</strong>
            </p>
          </div>

          <div className="p-4 bg-slate-50/30 border border-slate-100 rounded-xl space-y-1.5 shadow-sm">
            <span className="font-bold text-slate-950 block text-xs sm:text-sm flex items-center gap-0.5 uppercase tracking-wide">
              3.3 Das Goldene Window (16:00 - 21:30)
            </span>
            <p className="text-slate-750 text-xs font-medium leading-relaxed font-sans">
              Die Wallstreet-Profis haben ihre Richtung für den Handelstag festgeschrieben. Spreads schrumpfen auf ein absolutes Minimum zusammen (Spreads oft &lt; 0.1%).
              <br/><strong className="text-slate-900">Systemregel: Das einzig zulässige Zeitfenster für deine Nachkäufe und Platzierungen!</strong>
            </p>
          </div>
        </div>
      </div>

      {/* bento grid for risk policies and tax setup */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs sm:text-sm">
        
        {/* Risk & rounding rules */}
        <div className="p-5 bg-slate-50/10 border border-slate-100/50 rounded-2xl space-y-2">
          <h4 className="font-bold text-slate-900 flex items-center gap-1.5 font-display text-sm">
            <Percent className="h-4.5 w-4.5 text-slate-800" />
            1. Die 1%-Positionsgröße &amp; Abrundung
          </h4>
          <p className="text-slate-650 text-xs leading-relaxed font-medium">
            Niemals Stückzahlen aus dem Bauch schätzen! Jede einzelne Tranchen-Stückzahl wird stur über das Risiko berechnet. Bei einem Fehlschlag verlierst du exakt <strong>nur 1 %</strong> deines Depots.
            <br/><strong>Abrundungs-Gesetz:</strong> Berechnete Stückzahlen werden <strong>stur kaufmännisch abgerundet</strong>, um das Risiko niemals ungewollt zu verzerren.
          </p>
        </div>

        {/* Dynamic ATR stop rules */}
        <div className="p-5 bg-slate-50/10 border border-slate-100/50 rounded-2xl space-y-2">
          <h4 className="font-bold text-slate-900 flex items-center gap-1.5 font-display text-sm">
            <Compass className="h-4.5 w-4.5 text-slate-800" />
            2. Mathematische Stop-Loss Bestimmung (2x ATR)
          </h4>
          <p className="text-slate-650 text-xs leading-relaxed font-medium">
            Der Stop-Loss wird als GTC-Order direkt nach dem Einstieg im Broker hinterlegt. Wir verschieben Stops bei fallenden Kursen niemals abwärts!
            Der Stop berechnet sich als: <strong>Stop = max(Harter Anker, Kurs - 2 * ATR)</strong>. Wird das Stop durch ein Gap-down übersprungen, gilt rücksichtsloser Pflicht-Exit.
          </p>
        </div>

        {/* Clean Slate weekend check */}
        <div className="p-5 bg-slate-50/50 border border-slate-100 rounded-2xl space-y-2">
          <h4 className="font-bold text-slate-900 flex items-center gap-1.5 font-display text-sm">
            <FileText className="h-4.5 w-4.5 text-slate-800" />
            3. Der wöchentliche "Clean Slate"-Test (Tabula Rasa)
          </h4>
          <p className="text-slate-650 text-xs leading-relaxed font-medium">
            Jedes Wochenende wird jede Position stur folgender Frage unterzogen:
            <em> „Wenn ich diese Aktie heute nicht im Depot hätte und das Geld bar auf meinem Verrechnungskonto läge, würde ich sie beim aktuellen Kurs jetzt frisch kaufen?"</em>
            <br/>Antwort <strong>NEIN?</strong> ➔ Die Position wird am nächsten Handelstag ohne Diskussion manuell glattgestellt, um emotionale Altlasten zu entfernen!
          </p>
        </div>

        {/* Austrian taxes — broker-agnostisch */}
        <div className="p-5 bg-slate-50/50 border border-slate-100 rounded-2xl space-y-2">
          <h4 className="font-bold text-slate-900 flex items-center gap-1.5 font-display text-sm">
            <Coins className="h-4.5 w-4.5 text-slate-800" />
            4. Steuerrecht Österreich (allgemein)
          </h4>
          <div className="text-slate-650 text-xs leading-relaxed font-medium space-y-2">
            <p>
              Gewinne aus Aktien, ETFs und Krypto und alle Dividenden unterliegen in Österreich der
              <strong> Kapitalertragsteuer (KESt) von 27,5 %</strong>. Verluste innerhalb desselben Kalenderjahres
              werden mit Gewinnen verrechnet (Verlustausgleich).
            </p>
            <p>
              <strong>Inländischer „steuereinfacher" Broker:</strong> KESt wird automatisch einbehalten und abgeführt,
              du musst nichts in der Steuererklärung angeben. Verlustausgleich läuft im Hintergrund.
            </p>
            <p>
              <strong>Ausländischer Broker:</strong> KESt musst du selbst über die Einkommensteuererklärung erklären
              (E1kv). Verlustausgleich nur manuell.
            </p>
            <p>
              <strong>Hinweis:</strong> Diese Information ist allgemein. Für deine konkrete Situation (Trading-GmbH,
              Privatstiftung, Auslandsdepot, Krypto-Halteperiode etc.) bitte einen Steuerberater fragen.
            </p>
          </div>
        </div>

      </div>

      {/* Verkaufs-Methoden FIFO vs Durchschnitt */}
      <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-5 sm:p-6 space-y-3">
        <h3 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5 font-display uppercase tracking-widest">
          <Coins className="h-4.5 w-4.5 text-slate-800" />
          5. Verkaufs-Methoden: FIFO vs. Durchschnitt
        </h3>
        <p className="text-xs text-slate-700 leading-relaxed font-medium">
          Wenn du dieselbe Aktie mehrfach zu unterschiedlichen Kursen gekauft hast und einen Teil verkaufst,
          braucht dein Broker eine Regel, <strong>welche Stücke als verkauft gelten</strong>. Davon hängt direkt
          der zu versteuernde Gewinn ab. In der App wählst du beim Verkauf zwischen zwei Methoden:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
            <div className="font-bold text-slate-900 text-sm">📦 FIFO (First-In, First-Out)</div>
            <p className="text-slate-700 leading-relaxed">
              Das zuerst gekaufte Stück wird zuerst verkauft. Bei steigenden Kursen sind das meist die
              <strong> günstigsten Lots</strong> → <strong>höchster Buchgewinn</strong> → höhere Steuerlast,
              aber auch realisierter Gewinn am sichtbarsten.
            </p>
            <p className="text-slate-500 italic">
              Standard in Österreich bei inländischen steuereinfachen Depots — der Broker rechnet automatisch FIFO ab.
            </p>
          </div>
          <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
            <div className="font-bold text-slate-900 text-sm">⚖️ Durchschnittsmethode</div>
            <p className="text-slate-700 leading-relaxed">
              Alle Käufe derselben Position werden zu einem <strong>gewichteten Mittelwert</strong> zusammengefasst.
              Verkauf gegen diesen Durchschnittskurs gerechnet → <strong>geglätteter Gewinn/Verlust</strong>,
              unabhängig davon, welches konkrete Stück „gehen" soll.
            </p>
            <p className="text-slate-500 italic">
              Hilfreich für interne Übersicht und für Steuern bei manchen ausländischen Depots; in der App über die
              Verkaufsmaske wählbar (Feld „Steuermethode").
            </p>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-700 leading-relaxed">
          <strong className="text-slate-900">Bei steuereinfachen Inlands-Depots</strong> rechnet der Broker grundsätzlich FIFO.
          Wählst du in der App „Durchschnitt", führt das Journal die Performance intern anders, die Steuer-Realität
          beim Broker bleibt aber FIFO. Für Auslandsdepots / Selbstdeklaration prüfe die zulässige Methode mit
          deinem Steuerberater.
        </div>
      </div>
    </div>
      ) : (
        <AICoachTab routineDate={routineDate} />
      )}

    </div>
  );
}
