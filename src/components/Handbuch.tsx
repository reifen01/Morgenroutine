/**
 * HANDBUCH — durchsuchbares Nachschlagewerk
 * -----------------------------------------
 * Ersetzt den früheren JSX-Fließtext (289 Zeilen am Stück, auf dem Handy
 * unbenutzbar) durch: Suchfeld, Inhaltsverzeichnis zum Antippen,
 * aufklappbare Abschnitte und Direktlink-Unterstützung.
 *
 * Direktlink: <Handbuch springeZu="kaufampel" /> öffnet den Abschnitt
 * automatisch und scrollt hin — das nutzen die Hilfe-Fragezeichen der App.
 */
import { useState, useEffect, useRef } from "react";
import { Search, ChevronDown, ChevronRight, X, BookOpen } from "lucide-react";
import { HANDBUCH, handbuchSuchen } from "../utils/handbuchInhalt";

interface HandbuchProps {
  /** ID eines Abschnitts, der beim Öffnen direkt angezeigt werden soll. */
  springeZu?: string | null;
}

export default function Handbuch({ springeZu }: HandbuchProps) {
  const [suche, setSuche] = useState("");
  const [offen, setOffen] = useState<Set<string>>(new Set());
  const refs = useRef<Record<string, HTMLDivElement | null>>({});

  const treffer = handbuchSuchen(suche);

  // Bei Suche alles aufklappen — sonst müsste man nach dem Filtern
  // nochmal tippen, um den Treffer zu sehen.
  const suchModus = suche.trim().length > 0;

  // Direktlink: Abschnitt öffnen und hinscrollen.
  useEffect(() => {
    if (!springeZu) return;
    setSuche("");
    setOffen((prev) => new Set(prev).add(springeZu));
    const t = setTimeout(() => {
      refs.current[springeZu]?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => clearTimeout(t);
  }, [springeZu]);

  const toggle = (id: string) =>
    setOffen((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const springeZuAbschnitt = (id: string) => {
    setOffen((prev) => new Set(prev).add(id));
    setTimeout(() => {
      refs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  };

  return (
    <div className="space-y-4">
      {/* ── Suchfeld ── */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <input
          type="text"
          value={suche}
          onChange={(e) => setSuche(e.target.value)}
          placeholder="Suchen: z.B. Stop, VIX, Steuer, FOMO…"
          className="w-full h-11 bg-white border border-slate-200 rounded-xl pl-10 pr-10 text-[14px] font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-400"
        />
        {suche && (
          <button
            onClick={() => setSuche("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            title="Suche löschen"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* ── Inhaltsverzeichnis (nur ohne aktive Suche) ── */}
      {!suchModus && (
        <div className="bg-white border border-slate-200 rounded-xl p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <BookOpen className="h-3.5 w-3.5 text-slate-600" />
            <span className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wide">
              Inhalt — zum Springen antippen
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {HANDBUCH.map((a) => (
              <button
                key={`toc-${a.id}`}
                onClick={() => springeZuAbschnitt(a.id)}
                className="text-[12px] font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 transition-colors active:scale-95"
              >
                {a.icon} {a.titel}
              </button>
            ))}
          </div>
        </div>
      )}

      {suchModus && (
        <p className="text-[12px] font-semibold text-slate-500 px-1">
          {treffer.length === 0
            ? "Kein Treffer — versuch ein anderes Stichwort."
            : `${treffer.length} ${treffer.length === 1 ? "Abschnitt" : "Abschnitte"} gefunden`}
        </p>
      )}

      {/* ── Abschnitte ── */}
      <div className="space-y-2">
        {treffer.map((a) => {
          const istOffen = suchModus || offen.has(a.id);
          return (
            <div
              key={a.id}
              ref={(el) => { refs.current[a.id] = el; }}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden scroll-mt-4"
            >
              <button
                onClick={() => !suchModus && toggle(a.id)}
                className="w-full flex items-start gap-2.5 px-3 py-3 text-left hover:bg-slate-50 transition-colors"
              >
                <span className="text-[18px] leading-none mt-0.5 shrink-0">{a.icon}</span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[14px] font-extrabold text-slate-900">{a.titel}</span>
                  <span className="block text-[12px] font-semibold text-slate-500 mt-0.5">{a.kurz}</span>
                </span>
                {!suchModus && (
                  <span className="inline-flex items-center justify-center h-5 w-5 rounded-md border border-slate-300 bg-white text-slate-600 shrink-0 mt-0.5">
                    {istOffen
                      ? <ChevronDown className="h-3.5 w-3.5" strokeWidth={3} />
                      : <ChevronRight className="h-3.5 w-3.5" strokeWidth={3} />}
                  </span>
                )}
              </button>

              {istOffen && (
                <div className="border-t border-slate-100 divide-y divide-slate-50">
                  {a.punkte.map((p, i) => (
                    <div key={`${a.id}-${i}`} className="px-3 py-3">
                      {p.titel && (
                        <div className="text-[13px] font-extrabold text-slate-900 mb-1">{p.titel}</div>
                      )}
                      <p className="text-[13px] text-slate-700 font-medium leading-relaxed">{p.text}</p>
                      {p.regel && (
                        <div className="mt-2 flex items-start gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                          <span className="text-[12px] shrink-0">⚖️</span>
                          <span className="text-[12px] font-extrabold text-slate-900 leading-snug">{p.regel}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-[11px] text-slate-400 font-semibold px-1">
        Regelwerk nach „Master Your Trade" (René Berteit) und der eigenen Marktregime-Matrix.
        Steuerangaben sind Orientierung, keine Steuerberatung.
      </p>
    </div>
  );
}
