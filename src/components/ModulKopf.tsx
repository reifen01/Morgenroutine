/**
 * Einheitliche Modul-Überschrift (Variante C „Symbol-Kachel"):
 * großes dunkles Symbol, Titel in normaler Schreibweise, Untertitel,
 * Handbuch-Link rechts, darunter optional Knöpfe/Reiter und ein
 * dunkler Abschlussstrich. Eine Stelle für alle Module.
 *
 * Auf/Zu: Mit `modulId` wird der Kopf antippbar. Zugeklappt wird alles im
 * Container mit `data-modul="<modulId>"` ausgeblendet, außer dem Kopf selbst.
 * Der Zustand wird je Gerät in localStorage gemerkt
 * (Schlüssel morgenroutine_module_offen = { modulId: offen }).
 * Reine Anzeige-Einstellung: nicht im Backup, „Alles löschen" entfernt sie mit.
 */
import { ReactNode, useState } from "react";
import { ChevronDown } from "lucide-react";

const SPEICHER = "morgenroutine_module_offen";

function zustaendeLesen(): Record<string, boolean> {
  try {
    const roh = localStorage.getItem(SPEICHER);
    const obj = roh ? JSON.parse(roh) : {};
    return obj && typeof obj === "object" && !Array.isArray(obj) ? obj : {};
  } catch {
    return {};
  }
}

function zustandSchreiben(id: string, offen: boolean) {
  try {
    const obj = zustaendeLesen();
    obj[id] = offen;
    localStorage.setItem(SPEICHER, JSON.stringify(obj));
  } catch {
    /* Speicher nicht verfügbar — dann nur für diese Sitzung */
  }
}

/**
 * Gemerkter Auf/Zu-Zustand eines Moduls (auch für <details>-Leisten).
 * Ohne gespeicherten Wert gilt `standardOffen`.
 */
export function useModulOffen(id: string, standardOffen = true): [boolean, (offen: boolean) => void] {
  const [offen, setOffenState] = useState(() => {
    const v = zustaendeLesen()[id];
    return typeof v === "boolean" ? v : standardOffen;
  });
  const setOffen = (neu: boolean) => {
    setOffenState(neu);
    zustandSchreiben(id, neu);
  };
  return [offen, setOffen];
}

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
  /** Macht das Modul auf-/zuklappbar; Container trägt data-modul="<modulId>" */
  modulId?: string;
}

export default function ModulKopf({ symbol, titel, untertitel, hilfe, children, strich = true, modulId }: ModulKopfProps) {
  const [offen, setOffen] = useModulOffen(modulId ?? "", true);
  const zu = !!modulId && !offen;

  const umschalten = () => {
    if (!modulId) return;
    setOffen(!offen);
  };

  const kachelUndText = (
    <>
      <div className="h-11 w-11 shrink-0 rounded-2xl bg-slate-800 text-white flex items-center justify-center text-[22px] leading-none shadow-md shadow-slate-900/25">
        {symbol}
      </div>
      <div className="flex-1 min-w-0 text-left">
        <h3 className="text-[16px] sm:text-[17px] font-black text-slate-900 leading-tight font-sans">{titel}</h3>
        {untertitel && (
          <p className="text-[12px] font-semibold text-slate-600 leading-snug mt-0.5">{untertitel}</p>
        )}
      </div>
    </>
  );

  // Zugeklappt: alles im Modul-Container ausblenden, was den Kopf weder
  // enthält noch in ihm liegt. Nur dieses eine Modul (über die ID).
  const sel = modulId ? CSS.escape(modulId) : "";
  const ausblenden = modulId && zu
    ? `[data-modul="${sel}"] :not(:has([data-modul-kopf="${sel}"])):not([data-modul-kopf="${sel}"]):not([data-modul-kopf="${sel}"] *){display:none !important}`
    : null;

  return (
    <div
      data-modul-kopf={modulId}
      className={strich && !zu ? "border-b-2 border-slate-800 pb-3" : ""}
    >
      {ausblenden && <style>{ausblenden}</style>}
      <div className="flex items-center gap-3">
        {modulId ? (
          <button
            type="button"
            onClick={umschalten}
            aria-expanded={!zu}
            className="flex-1 min-w-0 flex items-center gap-3 active:opacity-70"
            title={zu ? "Modul öffnen" : "Modul schließen"}
          >
            {kachelUndText}
          </button>
        ) : (
          kachelUndText
        )}
        {hilfe && <div className="shrink-0">{hilfe}</div>}
        {modulId && (
          <button
            type="button"
            onClick={umschalten}
            aria-label={zu ? "Modul öffnen" : "Modul schließen"}
            className="shrink-0 h-9 w-9 rounded-xl border border-slate-300 bg-white text-slate-700 flex items-center justify-center active:scale-95"
          >
            <ChevronDown className={"h-5 w-5 transition-transform " + (zu ? "-rotate-90" : "")} />
          </button>
        )}
      </div>
      {children && !zu && <div className="mt-3 flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}
