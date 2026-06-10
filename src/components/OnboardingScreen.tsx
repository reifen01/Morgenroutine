import { useState } from "react";
import { TrendingUp, BarChart2, Brain, CheckCircle2, ChevronRight, CloudSun } from "lucide-react";

interface Props {
  onComplete: () => void;
}

const steps = [
  {
    icon: <CloudSun className="h-12 w-12 text-amber-400" />,
    title: "Willkommen bei Morgenroutine",
    text: "Dein persönlicher Handels-Assistent für die tägliche Börsen-Morgenroutine. Diese App gehört dir – alle Daten bleiben nur auf deinem Gerät.",
  },
  {
    icon: <BarChart2 className="h-12 w-12 text-indigo-400" />,
    title: "Dein Portfolio – nur für dich",
    text: "Trage einmal deine Positionen ein (TSLA, NOW, BABA, BTC). Ab dann zeigt dir die App täglich den aktuellen Stand, Gewinne & Verluste.",
  },
  {
    icon: <TrendingUp className="h-12 w-12 text-emerald-400" />,
    title: "Täglich 5 Minuten",
    text: "Öffne die App jeden Morgen vor der Börse. Trage die aktuellen Kurse ein – die App sagt dir, ob du kaufen, halten oder verkaufen solltest.",
  },
  {
    icon: <Brain className="h-12 w-12 text-violet-400" />,
    title: "KI-Coach inklusive",
    text: 'Der "AI Coach"-Tab ist dein persönlicher Trading-Psychologe. Er kennt deine 7 größten Denkfehler und hält dich diszipliniert.',
  },
];

export default function OnboardingScreen({ onComplete }: Props) {
  const [step, setStep] = useState(0);

  const next = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      localStorage.setItem("morgenroutine_onboarding_done", "1");
      onComplete();
    }
  };

  const current = steps[step];

  return (
    <div className="fixed inset-0 z-[100] bg-[#F4F4F7] flex flex-col items-center justify-center p-6">
      <div className="max-w-sm w-full flex flex-col items-center text-center gap-6">

        {/* Icon */}
        <div className="h-24 w-24 rounded-3xl bg-white shadow-lg shadow-slate-200 flex items-center justify-center">
          {current.icon}
        </div>

        {/* Text */}
        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-slate-900">{current.title}</h2>
          <p className="text-slate-500 text-base leading-relaxed">{current.text}</p>
        </div>

        {/* Step dots */}
        <div className="flex gap-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all ${
                i === step ? "w-6 bg-indigo-600" : "w-2 bg-slate-300"
              }`}
            />
          ))}
        </div>

        {/* Button */}
        <button
          onClick={next}
          className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold py-4 rounded-2xl text-base transition-colors shadow-md shadow-indigo-200"
        >
          {step < steps.length - 1 ? (
            <>Weiter <ChevronRight className="h-5 w-5" /></>
          ) : (
            <>Los geht's <CheckCircle2 className="h-5 w-5" /></>
          )}
        </button>

        {/* Skip */}
        {step < steps.length - 1 && (
          <button
            onClick={() => {
              localStorage.setItem("morgenroutine_onboarding_done", "1");
              onComplete();
            }}
            className="text-slate-400 text-sm hover:text-slate-600 transition-colors"
          >
            Überspringen
          </button>
        )}
      </div>
    </div>
  );
}
