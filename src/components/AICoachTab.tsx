/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from "react";
import { 
  MessageSquare, 
  Send, 
  Sparkles, 
  Brain, 
  HelpCircle, 
  AlertTriangle,
  Flame,
  ShieldCheck,
  User,
  Cpu
} from "lucide-react";
import { ChatMessage } from "../types";

interface AICoachTabProps {
  routineDate: string;
}

export default function AICoachTab({ routineDate }: AICoachTabProps) {
  const [deviceType, setDeviceType] = useState<"phone" | "tablet" | "desktop">("desktop");

  useEffect(() => {
    const handleResize = () => {
      const w = window.innerWidth;
      if (w < 640) {
        setDeviceType("phone");
      } else if (w < 1024) {
        setDeviceType("tablet");
      } else {
        setDeviceType("desktop");
      }
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "model",
      text: "Hallo! Ich bin dein unbestechlicher Trading-Coach. Ich wache stur über die Regeln deines System-Master Handbuchs und verteidige dein Depot gegen die 7 größten Denkfehler ( FOMO, Gier, Confirmation Bias etc.). Wie kann ich deine heutigen Setups auf Herz und Nieren prüfen?",
      timestamp: new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }),
    }
  ]);
  
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;
    
    setErrorMessage(null);
    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      role: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map(m => ({ role: m.role, text: m.text }))
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unerwarteter Fehler bei der AI-Anfrage.");
      }

      setMessages((prev) => [
        ...prev,
        {
          id: Math.random().toString(),
          role: "model",
          text: data.text,
          timestamp: new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }),
        }
      ]);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Verbindung zum AI-Modul gescheitert. Stelle sicher, dass die Dev-Server gestartet ist.");
    } finally {
      setIsLoading(false);
    }
  };

  // Quick preset triggers to help mobile users
  const quickPrompts = [
    {
      label: "🧠 FOMO & Gier Check",
      prompt: "Hilf mir, mich auf FOMO und Gier zu prüfen. Ich habe das Gefühl, ich verpasse gerade ein großes Kurs-Szenario bei einer Aktie."
    },
    {
      label: "🚦 VIX/VXV Struktur überprüfen",
      prompt: "Erkläre mir stur, warum eine Backwardation im Volatilitäts-Trio zu einem sofortigen, unbestechlichen Kaufverbot führt!"
    },
    {
      label: "🇦🇹 Österreich-KESt erklären",
      prompt: "Welche steuerlichen Besonderheiten gelten für mich als österreichischen Anleger bei einem steuereinfachen Broker?"
    },
    {
      label: "📉 Invertieren bei grünem Markt",
      prompt: "Was versteht das System unter dem Begriff 'Invertieren bei grünem Markt'? Wie rettet man gefallene Aktien mit Short Calls?"
    }
  ];

  // Helper routine to format text on screen nicely without bulky external library
  const formatResponseLines = (text: string) => {
    return text.split("\n").map((line, index) => {
      // Highlight lists
      if (line.trim().startsWith("-") || line.trim().startsWith("*")) {
        return (
          <li key={index} className="ml-4 list-disc pl-1 py-0.5 text-slate-800">
            {renderBoldPhrases(line.replace(/^[-*]\s*/, ""))}
          </li>
        );
      }
      
      // Highlight bold labels
      if (line.includes("🚨") || line.includes("⚠️") || line.includes("🔴")) {
        return (
          <p key={index} className="my-1.5 font-bold text-slate-900 bg-rose-50 border border-slate-100 p-2 rounded-lg">
            {renderBoldPhrases(line)}
          </p>
        );
      }

      return (
        <p key={index} className="my-1 text-slate-800 leading-relaxed text-sm sm:text-base">
          {renderBoldPhrases(line)}
        </p>
      );
    });
  };

  const renderBoldPhrases = (lineString: string) => {
    const parts = lineString.split(/\*\*(.*?)\*\*/g);
    return parts.map((part, i) => {
      return i % 2 === 1 ? <strong key={i} className="text-emerald-950 font-black font-semibold">{part}</strong> : part;
    });
  };

  return (
    <div 
      className={`flex flex-col bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-lg shadow-slate-200/10 transition-all duration-300`}
      style={{ height: deviceType === "phone" ? "480px" : "calc(100dvh - 16rem)" }}
    >
      
      {/* Dynamic Header AI with optimal mobile spacing */}
      <div className={`bg-white border-b border-slate-100 flex items-center justify-between ${deviceType === "phone" ? "p-3" : "p-5"}`}>
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 w-full">
          <div className={`bg-slate-100 border border-slate-200 text-slate-900 flex items-center justify-center shrink-0 ${deviceType === "phone" ? "p-1.5 rounded-xl" : "p-2.5 rounded-2xl"}`}>
            <Cpu className={`${deviceType === "phone" ? "h-4 w-4" : "h-5 w-5"} text-slate-800`} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
              <h3 className="text-xs sm:text-base font-bold tracking-tight font-display text-slate-900 leading-none">
                Unbestechlicher Trading-Coach
              </h3>
              <span className="bg-slate-900 text-white border border-slate-900 text-[8px] sm:text-[9px] font-extrabold px-1.5 sm:px-2 py-0.5 rounded-full whitespace-nowrap">
                Renes Master AI
              </span>
            </div>
            <p className="text-[8px] sm:text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5 truncate">
              Gefüttert mit den 7 größten Denkfehlern &amp; der Vola-Klausel
            </p>
          </div>
        </div>
      </div>

      {/* Main chat window Area with responsive margins */}
      <div className={`flex-1 overflow-y-auto bg-slate-50/50 no-scrollbar ${deviceType === "phone" ? "p-3 space-y-3.5" : "p-5 space-y-5"}`}>
        {messages.map((m) => {
          const isUser = m.role === "user";
          return (
            <div
              key={m.id}
              className={`flex items-start ${deviceType === "phone" ? "gap-2 max-w-[95%]" : "gap-3 max-w-[85%]"} ${
                isUser ? "ml-auto flex-row-reverse" : "mr-auto"
              }`}
            >
              <div
                className={`text-white shrink-0 shadow-xs flex items-center justify-center ${
                  deviceType === "phone" ? "p-1.5 rounded-xl" : "p-2.5 rounded-2xl"
                } ${isUser ? "bg-slate-900" : "bg-slate-800"}`}
              >
                {isUser ? (
                  <User className={deviceType === "phone" ? "h-3.5 w-3.5" : "h-4 w-4"} />
                ) : (
                  <Brain className={deviceType === "phone" ? "h-3.5 w-3.5" : "h-4 w-4"} />
                )}
              </div>
              
              <div
                className={`rounded-3xl text-xs sm:text-sm leading-relaxed ${
                  deviceType === "phone" ? "p-3 rounded-2xl" : "p-4"
                } ${
                  isUser
                    ? "bg-slate-900 text-white rounded-tr-none shadow-sm shadow-slate-900/10 font-bold"
                    : "bg-white text-slate-850 rounded-tl-none border border-slate-200 shadow-xs"
                }`}
              >
                <div className="space-y-1">
                  {isUser ? (
                    <p className="leading-relaxed text-xs sm:text-base font-semibold">{m.text}</p>
                  ) : (
                    <div className="space-y-1 text-slate-805">{formatResponseLines(m.text)}</div>
                  )}
                  <span className={`block text-[8px] text-right mt-1 font-bold ${isUser ? 'text-slate-300' : 'text-slate-400'}`}>
                    {m.timestamp}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className={`flex items-start ${deviceType === "phone" ? "gap-2 max-w-[95%]" : "gap-3 max-w-[85%]"} mr-auto`}>
            <div className={`text-white shrink-0 bg-slate-800 flex items-center justify-center ${deviceType === "phone" ? "p-1.5 rounded-xl" : "p-2.5 rounded-2xl"}`}>
              <Brain className={`${deviceType === "phone" ? "h-3.5 w-3.5" : "h-4 w-4"} animate-spin`} />
            </div>
            <div className={`bg-white border border-slate-200 rounded-3xl rounded-tl-none shadow-xs text-xs sm:text-sm text-slate-500 flex items-center gap-2 ${deviceType === "phone" ? "p-3 rounded-2xl" : "p-4"}`}>
              <Sparkles className="h-4 w-4 animate-pulse text-slate-900 shrink-0" />
              <span>Coach Rene analysiert dein Setup auf Denkfehler...</span>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="p-3 bg-rose-50 border border-rose-100 rounded-2xl text-rose-950 text-[11px] sm:text-xs font-semibold font-sans flex items-start gap-2 shadow-sm max-w-lg mx-auto">
            <AlertTriangle className="h-4.5 w-4.5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span>{errorMessage}</span>
              <p className="text-[9px] text-rose-700 font-bold">Tipp: Stelle sicher, dass du deinen GEMINI_API_KEY im Secrets-Panel eingerichtet hast.</p>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Quick Prompts Triggers Area with responsive padding */}
      <div className={`bg-slate-50/50 border-t border-slate-100 overflow-x-auto whitespace-nowrap scrollbar-none flex gap-1.5 sm:gap-2 ${deviceType === "phone" ? "px-3 py-2" : "px-4 py-3"}`}>
        {quickPrompts.map((qp, i) => (
          <button
            key={i}
            onClick={() => handleSendMessage(qp.prompt)}
            disabled={isLoading}
            className="inline-block px-3 py-1 bg-white hover:bg-slate-900 hover:text-white border border-slate-200 rounded-full text-[10px] sm:text-xs font-bold transition-all shrink-0 cursor-pointer disabled:opacity-50 active:scale-95 shadow-xs"
          >
            {qp.label}
          </button>
        ))}
      </div>

      {/* Input Form Text Area with optimized sizing for smaller devices */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage(inputText);
        }}
        className={`bg-white border-t border-slate-100 flex gap-2 shrink-0 items-center ${deviceType === "phone" ? "p-2.5" : "p-4"}`}
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={deviceType === "phone" ? "Frag deinen Coach..." : "Frag nach der VIX/VXV-Regel, deiner TSLA-Absicherung oder analysiere deinen Trade..."}
          className="flex-1 h-9 sm:h-11 bg-slate-50/50 border border-slate-200 focus:border-slate-800 rounded-xl px-3 sm:px-4 text-[11px] sm:text-sm focus:outline-none transition-colors placeholder-slate-400 font-semibold text-slate-800"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isLoading}
          className="h-9 w-9 sm:h-11 sm:w-11 bg-slate-900 hover:bg-black disabled:bg-slate-100 text-white disabled:text-slate-400 rounded-xl flex items-center justify-center transition-all shadow-xs shrink-0 active:scale-95 cursor-pointer"
        >
          <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </button>
      </form>

    </div>
  );
}
