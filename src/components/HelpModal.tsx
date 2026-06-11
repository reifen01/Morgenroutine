import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { X, BookOpen, ExternalLink } from "lucide-react";
import handbookRaw from "../../HANDBUCH.md?raw";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Section anchor to jump to on open. Match against the slug from h2/h3 headings. */
  initialSection?: string;
}

interface Section {
  level: 2 | 3;
  title: string;
  slug: string;
  start: number;
  end: number;
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .replace(/[äöüß]/g, (c) => ({ ä: "ae", ö: "oe", ü: "ue", ß: "ss" }[c] || c))
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseSections(md: string): Section[] {
  const lines = md.split("\n");
  const sections: Section[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/^(##|###)\s+(.+?)\s*$/);
    if (m) {
      const level = m[1] === "##" ? 2 : 3;
      const title = m[2].replace(/^[\d\.\s]+/, "").trim();
      sections.push({
        level: level as 2 | 3,
        title,
        slug: slugify(title),
        start: i,
        end: lines.length,
      });
    }
  }
  for (let i = 0; i < sections.length - 1; i++) {
    sections[i].end = sections[i + 1].start;
  }
  return sections;
}

export default function HelpModal({ isOpen, onClose, initialSection }: HelpModalProps) {
  const sections = useMemo(() => parseSections(handbookRaw), []);
  const lines = useMemo(() => handbookRaw.split("\n"), []);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen && initialSection) {
      const match = sections.find((s) => s.slug === initialSection || s.slug.startsWith(initialSection));
      setActiveSlug(match?.slug || sections[0]?.slug || null);
    } else if (isOpen && !activeSlug) {
      setActiveSlug(sections[0]?.slug || null);
    }
  }, [isOpen, initialSection, sections, activeSlug]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const activeSection = sections.find((s) => s.slug === activeSlug) || sections[0];
  const activeMarkdown = activeSection
    ? lines.slice(activeSection.start, activeSection.end).join("\n")
    : handbookRaw;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[88vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-slate-800" />
            <h2 className="font-bold text-slate-900">Handbuch</h2>
            <a
              href="https://github.com/reifen01/Morgenroutine/blob/main/HANDBUCH.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-slate-800 hover:text-slate-900 flex items-center gap-1 ml-2"
              title="Auf GitHub öffnen"
            >
              GitHub <ExternalLink className="w-3 h-3" />
            </a>
            <a
              href="/anleitung.html"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-slate-800 hover:text-slate-900 flex items-center gap-1"
              title="Installations-Anleitung öffnen"
            >
              Installation <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-200 rounded-lg transition-colors"
            aria-label="Schließen"
          >
            <X className="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          <aside className="w-56 shrink-0 border-r border-slate-200 overflow-y-auto bg-slate-50 py-2">
            <nav className="text-sm">
              {sections.map((s) => (
                <button
                  key={s.slug}
                  onClick={() => {
                    setActiveSlug(s.slug);
                    contentRef.current?.scrollTo({ top: 0, behavior: "auto" });
                  }}
                  className={
                    "w-full text-left px-3 py-1.5 transition-colors " +
                    (s.level === 3 ? "pl-6 text-xs " : "font-semibold ") +
                    (activeSlug === s.slug
                      ? "bg-slate-100 text-slate-900"
                      : "text-slate-600 hover:bg-slate-100")
                  }
                  title={s.title}
                >
                  {s.title}
                </button>
              ))}
            </nav>
          </aside>

          <div
            ref={contentRef}
            className="flex-1 overflow-y-auto px-6 py-4 text-slate-800 text-sm leading-relaxed"
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: ({ children }) => <h1 className="text-2xl font-bold mt-0 mb-4 text-slate-900">{children}</h1>,
                h2: ({ children }) => <h2 className="text-xl font-bold mt-0 mb-3 text-slate-900">{children}</h2>,
                h3: ({ children }) => <h3 className="text-base font-bold mt-5 mb-2 text-slate-900">{children}</h3>,
                h4: ({ children }) => <h4 className="text-sm font-bold mt-4 mb-1 text-slate-900">{children}</h4>,
                p: ({ children }) => <p className="my-2">{children}</p>,
                ul: ({ children }) => <ul className="list-disc pl-5 my-2 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-5 my-2 space-y-1">{children}</ol>,
                li: ({ children }) => <li className="leading-snug">{children}</li>,
                strong: ({ children }) => <strong className="font-semibold text-slate-900">{children}</strong>,
                table: ({ children }) => (
                  <div className="overflow-x-auto my-3">
                    <table className="text-xs border-collapse border border-slate-200">{children}</table>
                  </div>
                ),
                thead: ({ children }) => <thead className="bg-slate-50">{children}</thead>,
                th: ({ children }) => <th className="text-left px-2 py-1.5 border border-slate-200 font-semibold text-slate-900">{children}</th>,
                td: ({ children }) => <td className="px-2 py-1.5 border border-slate-200 align-top">{children}</td>,
                code: ({ children, className }) => {
                  const isBlock = className?.includes("language-");
                  if (isBlock) {
                    return <code className="block bg-slate-900 text-slate-100 p-3 rounded my-2 font-mono text-xs overflow-x-auto">{children}</code>;
                  }
                  return <code className="bg-slate-100 px-1 py-0.5 rounded text-xs font-mono">{children}</code>;
                },
                pre: ({ children }) => <pre className="my-2">{children}</pre>,
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-slate-300 pl-4 my-3 italic text-slate-600">{children}</blockquote>
                ),
                hr: () => <hr className="my-6 border-slate-200" />,
                a: ({ children, href }) => (
                  <a href={href} target="_blank" rel="noopener noreferrer" className="text-slate-800 hover:text-slate-900 underline">
                    {children}
                  </a>
                ),
              }}
            >
              {activeMarkdown}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  );
}
