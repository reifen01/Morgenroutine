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
      prompt: "Welche steuerlichen Besonderheiten gelten für mich als österreichischen Anleger bei einem steuereinfachen Broker wie DADAT?"
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
    <div className="flex flex-col h-[calc(100dvh-14rem)] bg-white border border-slate-100 rounded-3xl overflow-hidden shadow-lg shadow-slate-200/10">
      
      {/* Dynamic Header AI */}
      <div className="bg-white border-b border-slate-50 p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-50 border border-indigo-100 p-2.5 rounded-2xl text-indigo-600">
            <Cpu className="h-5 w-5 text-indigo-650" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold tracking-tight font-display flex items-center gap-1.5 text-slate-900">
              Unbestechlicher Trading-Coach
              <span className="bg-indigo-50 text-indigo-700 border border-indigo-100 text-[9px] font-bold px-2 py-0.5 rounded-full">
                Renes Master AI
              </span>
            </h3>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
              Gefüttert mit den 7 größten Denkfehlern &amp; der Vola-Klausel
            </p>
          </div>
        </div>
      </div>

      {/* Main chat window Area */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-slate-50/50 no-scrollbar">
        {messages.map((m) => {
          const isUser = m.role === "user";
          return (
            <div
              key={m.id}
              className={`flex items-start gap-3 max-w-[85%] ${
                isUser ? "ml-auto flex-row-reverse" : "mr-auto"
              }`}
            >
              <div
                className={`p-2.5 rounded-2xl text-white shrink-0 shadow-xs ${
                  isUser ? "bg-indigo-650" : "bg-slate-800"
                }`}
              >
                {isUser ? <User className="h-4 w-4" /> : <Brain className="h-4 w-4" />}
              </div>
              
              <div
                className={`p-4 rounded-3xl text-sm leading-relaxed ${
                  isUser
                    ? "bg-indigo-650 text-white rounded-tr-none shadow-sm shadow-indigo-100/10 font-medium"
                    : "bg-white text-slate-800 rounded-tl-none border border-slate-100 shadow-xs"
                }`}
              >
                <div className="space-y-1">
                  {isUser ? (
                    <p className="leading-relaxed text-sm sm:text-base font-medium">{m.text}</p>
                  ) : (
                    <div className="space-y-1 text-slate-800">{formatResponseLines(m.text)}</div>
                  )}
                  <span className={`block text-[9px] text-right mt-1.5 font-bold ${isUser ? 'text-indigo-200' : 'text-slate-400'}`}>
                    {m.timestamp}
                  </span>
                </div>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-start gap-3 max-w-[85%] mr-auto">
            <div className="p-2.5 rounded-2xl text-white shrink-0 bg-slate-800">
              <Brain className="h-4 w-4 animate-spin" />
            </div>
            <div className="p-4 bg-white border border-slate-100 rounded-3xl rounded-tl-none shadow-xs text-sm text-slate-400 flex items-center gap-2">
              <Sparkles className="h-4 w-4 animate-pulse text-indigo-650" />
              <span>Coach Rene analysiert dein Setup auf Denkfehler...</span>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 bg-rose-50 border border-rose-100 rounded-2xl text-rose-950 text-xs font-semibold font-sans flex items-start gap-2 shadow-sm max-w-lg mx-auto">
            <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span>{errorMessage}</span>
              <p className="text-[10px] text-rose-700 font-bold">Tipp: Stelle sicher, dass du deinen GEMINI_API_KEY im Secrets-Panel eingerichtet hast.</p>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Quick Prompts Triggers Area */}
      <div className="bg-slate-50/50 px-4 py-3 border-t border-slate-50 overflow-x-auto whitespace-nowrap scrollbar-none flex gap-2">
        {quickPrompts.map((qp, i) => (
          <button
            key={i}
            onClick={() => handleSendMessage(qp.prompt)}
            disabled={isLoading}
            className="inline-block px-3.5 py-1.5 bg-white hover:bg-indigo-50 hover:text-indigo-950 border border-slate-150 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer disabled:opacity-50 active:scale-95 shadow-sm"
          >
            {qp.label}
          </button>
        ))}
      </div>

      {/* Input Form Text Area */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage(inputText);
        }}
        className="p-4 bg-white border-t border-slate-50 flex gap-2 shrink-0 items-center"
      >
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Frag nach der VIX/VXV-Regel, deiner TSLA-Absicherung oder analysiere deinen Trade..."
          className="flex-1 h-11 bg-slate-50/50 border border-slate-200 focus:border-indigo-500 rounded-xl px-4 text-xs sm:text-sm focus:outline-none transition-colors placeholder-slate-400"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isLoading}
          className="h-11 w-11 bg-indigo-650 hover:bg-indigo-700 disabled:bg-slate-100 text-white disabled:text-slate-400 rounded-xl flex items-center justify-center transition-all shadow-xs shrink-0 active:scale-95 cursor-pointer"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>

    </div>
  );
}
