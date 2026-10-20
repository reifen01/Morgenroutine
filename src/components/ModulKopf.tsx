/**
 * Einheitliche Modul-Überschrift (Variante C „Symbol-Kachel"):
 * großes dunkles Symbol, Titel in normaler Schreibweise, Untertitel,
 * Handbuch-Link rechts, darunter optional Knöpfe/Reiter und ein
 * dunkler Abschlussstrich. Eine Stelle für alle Module.
 */
import { ReactNode } from "react";

interface ModulKopfProps {
  symbol: ReactNode;
  titel: ReactNode;
  untertitel?: ReactNode;
  /** z. B. <HilfeLink …/> — sitzt rechts neben dem Titel */
  hilfe?: ReactNode;
  /** Knöpfe, Umschalter oder Reiter unter dem Titel */
  children?: ReactNode;
  /** Abschlussstrich unten (Standard: ja) */
  strich?: boolean;
}

export default function ModulKopf({ symbol, titel, untertitel, hilfe, children, strich = true }: ModulKopfProps) {
  return (
    <div className={strich ? "border-b-2 border-slate-800 pb-3" : ""}>
      <div className="flex items-center gap-3">
        <div className="h-11 w-11 shrink-0 rounded-2xl bg-slate-800 text-white flex items-center justify-center text-[22px] leading-none shadow-md shadow-slate-900/25">
          {symbol}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[16px] sm:text-[17px] font-black text-slate-900 leading-tight font-sans">{titel}</h3>
          {untertitel && (
            <p className="text-[12px] font-semibold text-slate-600 leading-snug mt-0.5">{untertitel}</p>
          )}
        </div>
        {hilfe && <div className="shrink-0">{hilfe}</div>}
      </div>
      {children && <div className="mt-3 flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
