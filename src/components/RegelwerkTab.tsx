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
          Das unbestechliche System schützt dein Kapital vor deinem eigenen Ego. Präge dir diese psychologischen Hürden ein:
        </p>
        
        <ul className="space-y-3 text-xs sm:text-sm text-slate-800 list-disc list-inside pl-1 font-medium leading-relaxed">
          <li>
            <strong className="text-slate-900">Bestätigungsfehler (Confirmation):</strong> Suchst du nur nach bearischen oder bullischen Argumenten, die deinen Wunschtrade decken? 🚨 <em className="text-rose-700">Lösung: Liste im Rechner stur einen Bear Case auf!</em>
          </li>
          <li>
            <strong className="text-slate-900">Verlustaversion:</strong> Scheust du den bitteren Schmerz eines Verlustes und ziehst Stops heimlich herab? 🚨 <em className="text-rose-700">Lösung: Absicherungsstops werden stur sofort platziert und niemals nachgeben!</em>
          </li>
          <li>
            <strong className="text-slate-900">FOMO (Gier nach schnellem Geld):</strong> Springst du in hastige Rallies? 🚨 <em className="text-rose-700">Lösung: Wir triggern stur über mathematische Limits, sonst herrscht absolute Inaktivität.</em>
          </li>
          <li>
            <strong className="text-slate-900">Rache-Trading:</strong> Hast du unlängst Verluste gemacht und willst sie durch größere Positionsgrößen erpressen? 🚨 <em className="text-rose-700">Lösung: Strikte 1%-Risiko-Regel pro Trade!</em>
          </li>
          <li>
            <strong className="text-slate-900">Selbstüberschätzung:</strong> Nach Gewinnphasen glaubst du, den Markt kontrollieren zu können? 🚨 <em className="text-rose-700">Lösung: Demut bewahren, Tranchengröße deckeln und Gewinnpausen forcieren.</em>
          </li>
          <li>
            <strong className="text-slate-900">Kontrollillusion:</strong> Du suchst nach unzähligen Indikatoren? 🚨 <em className="text-rose-700">Lösung: Reduziere Werkzeuge. Unser Volatilitäts-Trio reicht vollkommen aus!</em>
          </li>
          <li>
            <strong className="text-slate-900">Planlosigkeit:</strong> Entscheidest du spontan vor dem Chart? 🚨 <em className="text-rose-700">Lösung: Nutze stur dieses Morgenroutine-Cockpit, dokumentiere Entscheidungen im Tages-Journal.</em>
          </li>
        </ul>
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
            <em> "Wenn ich diese Aktie heute nicht im Depot hätte und das Geld bar auf dem DADAT-Konto läge, würde ich sie beim aktuellen Kurs jetzt frisch kaufen?"</em>
            <br/>Antwort <strong>NEIN?</strong> ➔ Die Position wird am nächsten Handelstag ohne Diskussion manuell glattgestellt, um emotionale Altlasten zu entfernen!
          </p>
        </div>

        {/* Austrian taxes specs */}
        <div className="p-5 bg-slate-50/50 border border-slate-100 rounded-2xl space-y-2">
          <h4 className="font-bold text-slate-900 flex items-center gap-1.5 font-display text-sm">
            <Coins className="h-4.5 w-4.5 text-slate-800" />
            4. Österreichs steuereinfaches Recht (DADAT-Konto)
          </h4>
          <p className="text-slate-650 text-xs leading-relaxed font-medium">
            In Österreich unterliegen Gewinne und Dividenden einer festen <strong>KESt von 27,5%</strong>. 
            Da DADAT ein inländischer, in Österreich steuereinfacher Broker ist, wird die Abgabe vollautomatisch abgeführt.
            Ein automatischer Verlustausgleich innerhalb des Kalenderjahres erfolgt direkt im Hintergrund.
          </p>
        </div>

      </div>
    </div>
      ) : (
        <AICoachTab routineDate={routineDate} />
      )}

    </div>
  );
}
