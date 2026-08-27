/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
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
import Handbuch from "./Handbuch";

interface RegelwerkTabProps {
  routineDate: string;
  /** Abschnitt, zu dem ein Hilfe-Symbol ("?" oder Buch) springen soll. */
  handbuchAbschnitt?: string | null;
  /** Klartext-Name des Herkunfts-Tabs (z.B. "Depot") für den Zurück-Knopf. */
  zurueckLabel?: string | null;
  /** Springt zurück zum Tab, von dem aus das Hilfe-Symbol angetippt wurde. */
  onZurueck?: () => void;
}

export default function RegelwerkTab({ routineDate, handbuchAbschnitt, zurueckLabel, onZurueck }: RegelwerkTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<"regeln" | "coach">("regeln");

  // Bei Sprung aus der App immer auf den Regel-Reiter wechseln.
  useEffect(() => {
    if (handbuchAbschnitt) setActiveSubTab("regeln");
  }, [handbuchAbschnitt]);

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
        <div className="animate-fade-in">
          <Handbuch springeZu={handbuchAbschnitt} zurueckLabel={zurueckLabel} onZurueck={onZurueck} />
        </div>
      ) : (

        <AICoachTab routineDate={routineDate} />
      )}

    </div>
  );
}
