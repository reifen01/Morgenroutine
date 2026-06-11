/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { CloudSun, FileSpreadsheet, BookOpen, HelpCircle } from "lucide-react";

interface CompactHeaderProps {
  routineDate: string;
  onDateChange: (val: string) => void;
  onCopyExcelLine: () => void;
  onOpenHelp: () => void;
  isSystemReady: boolean;
}

export default function CompactHeader({
  routineDate,
  onDateChange,
  onCopyExcelLine,
  onOpenHelp,
  isSystemReady,
}: CompactHeaderProps) {
  // Convert YYYY-MM-DD back to DD.MM.YYYY for display
  const getDeDateString = (isoDate: string) => {
    if (!isoDate) return "01.06.2026";
    const parts = isoDate.split("-");
    if (parts.length === 3) {
      return `${parts[2]}.${parts[1]}.${parts[0]}`;
    }
    return isoDate;
  };

  const handleInputValueChange = (val: string) => {
    // Attempt parsing de format DD.MM.YYYY to ISO
    const deMatch = val.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
    if (deMatch) {
      onDateChange(`${deMatch[3]}-${deMatch[2]}-${deMatch[1]}`);
      return;
    }
    
    // Also accept generic input
    onDateChange(val);
  };

  return (
    <header className="bg-white border-b border-slate-200 shrink-0 z-40 px-6 sm:px-10 py-4 flex items-center justify-between h-20 shadow-sm shadow-slate-100">
      <div className="flex items-center gap-4">
        <div className="bg-indigo-50 border border-indigo-100 p-2.5 rounded-2xl text-indigo-600 flex items-center justify-center h-11 w-11 shadow-sm">
          <CloudSun className="h-5.5 w-5.5 text-indigo-500" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight text-indigo-600">LUMINA</span>
            <span
              className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200"
              title="Build-Version (Commit-SHA)"
            >
              {__BUILD_VERSION__}
            </span>
            <span className="hidden sm:inline w-1.5 h-1.5 rounded-full bg-slate-300"></span>
            <h1 className="hidden sm:inline text-sm font-bold tracking-tight text-slate-900 font-display">
              MORGENROUTINE &amp; HANDELS-WÄCHTER
            </h1>
          </div>
          <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase mt-0.5">
            Sicherheitsfokus • Desktop &amp; Mobil • unbestechlich
          </p>
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        {/* Zentraler Routine-Datumswähler */}
        <div className="flex items-center gap-2 bg-slate-50 px-3.5 py-1.5 rounded-xl border border-slate-200">
          <span className="text-[10px] font-bold text-slate-400 font-mono tracking-widest">DATUM</span>
          <input
            type="text"
            value={getDeDateString(routineDate)}
            onChange={(e) => handleInputValueChange(e.target.value)}
            placeholder="TT.MM.JJJJ"
            className="w-20 sm:w-24 text-xs sm:text-sm font-bold font-mono bg-transparent text-indigo-600 focus:outline-none focus:ring-0 placeholder-slate-400"
          />
        </div>
        
        {/* Quick Excel Export Button im Header */}
        <button
          onClick={onCopyExcelLine}
          className="flex items-center justify-center h-9 w-9 bg-slate-50 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 rounded-xl shadow-xs transition-all active:scale-95 duration-200"
          title="Excel-Zeile kopieren (Strg+V)"
        >
          <FileSpreadsheet className="h-4.5 w-4.5" />
        </button>

        <button
          onClick={onOpenHelp}
          className="flex items-center justify-center h-9 w-9 bg-slate-50 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 rounded-xl shadow-xs transition-all active:scale-95 duration-200"
          title="Handbuch / Regel-Hilfe öffnen (zeigt Hilfe zum aktuellen Tab)"
        >
          <HelpCircle className="h-4.5 w-4.5" />
        </button>

        <a
          href="/anleitung.html"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center h-9 w-9 bg-slate-50 hover:bg-indigo-50 text-slate-500 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 rounded-xl shadow-xs transition-all active:scale-95 duration-200"
          title="Installations-Anleitung öffnen"
        >
          <BookOpen className="h-4 w-4" />
        </a>

        <span
          className={`h-2.5 w-2.5 rounded-full ${
            isSystemReady ? "bg-emerald-500 shadow-lg shadow-emerald-500/50 animate-pulse" : "bg-slate-300"
          }`}
        ></span>
      </div>
    </header>
  );
}
