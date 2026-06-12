import { useEffect, useState } from "react";
import { TrendingUp, BarChart2, Brain, CheckCircle2, ChevronRight, CloudSun, Download } from "lucide-react";
import InstallInstructions from "./InstallInstructions";

interface Props {
  onComplete: () => void;
}

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const steps = [
  {
    icon: <CloudSun className="h-12 w-12 text-amber-400" />,
    title: "Willkommen bei Morgenroutine",
    text: "Dein persönlicher Handels-Assistent für die tägliche Börsen-Morgenroutine. Diese App gehört dir – alle Daten bleiben nur auf deinem Gerät.",
  },
  {
    icon: <BarChart2 className="h-12 w-12 text-slate-400" />,
    title: "Dein Portfolio – nur für dich",
    text: "Trage einmal deine Positionen ein (TSLA, NOW, BABA, BTC). Ab dann zeigt dir die App täglich den aktuellen Stand, Gewinne & Verluste.",
  },
  {
    icon: <TrendingUp className="h-12 w-12 text-emerald-400" />,
    title: "Täglich 5 Minuten",
    text: "Öffne die App jeden Morgen vor der Börse. Trage die aktuellen Kurse ein – die App sagt dir, ob du kaufen, halten oder verkaufen solltest.",
  },
  {
    icon: <Brain className="h-12 w-12 text-slate-600" />,
    title: "KI-Coach inklusive",
    text: 'Der "AI Coach"-Tab ist dein persönlicher Trading-Psychologe. Er kennt deine 7 größten Denkfehler und hält dich diszipliniert.',
  },
  // "install" step is appended dynamically below if available
];

export default function OnboardingScreen({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    const ua = window.navigator.userAgent;
    setIsIos(/iPad|iPhone|iPod/.test(ua) && !(window as unknown as { MSStream?: unknown }).MSStream);
    setIsStandalone(
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true
    );

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Decide whether to show the install step at the end: skip if already
  // running as a PWA, otherwise always offer it (Android via prompt, iOS
  // via manual share-instructions).
  const showInstallStep = !isStandalone;
  const totalSteps = steps.length + (showInstallStep ? 1 : 0);
  const isInstallStep = step === steps.length;

  const finish = () => {
    localStorage.setItem("morgenroutine_onboarding_done", "1");
    onComplete();
  };

  const next = () => {
    if (step < totalSteps - 1) {
      setStep(step + 1);
    } else {
      finish();
    }
  };

  const triggerInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      await deferredPrompt.userChoice;
      setDeferredPrompt(null);
    }
    finish();
  };

  const current = steps[step] || steps[0];

  return (
    <div className="fixed inset-0 z-[100] bg-[#F4F4F7] flex flex-col items-center justify-center p-6">
      <div className="max-w-sm w-full flex flex-col items-center text-center gap-6">

        {/* Icon */}
        <div className="h-24 w-24 rounded-3xl bg-white shadow-lg shadow-slate-200 flex items-center justify-center">
          {isInstallStep ? (
            <Download className="h-12 w-12 text-slate-700" />
          ) : (
            current.icon
          )}
        </div>

        {/* Text */}
        {isInstallStep ? (
          <div className="space-y-3 w-full">
            <h2 className="text-2xl font-bold text-slate-900">App installieren?</h2>
            <p className="text-slate-500 text-base leading-relaxed">
              Installier die Morgenroutine als eigene App auf deinem Gerät — sie startet schneller und ist nur einen Tipp entfernt.
            </p>
            <InstallInstructions isIos={isIos} hasInstallPrompt={!!deferredPrompt} />
          </div>
        ) : (
          <div className="space-y-3">
            <h2 className="text-2xl font-bold text-slate-900">{current.title}</h2>
            <p className="text-slate-500 text-base leading-relaxed">{current.text}</p>
          </div>
        )}

        {/* Step dots */}
        <div className="flex gap-2">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all ${
                i === step ? "w-6 bg-slate-800" : "w-2 bg-slate-300"
              }`}
            />
          ))}
        </div>

        {/* Button */}
        {isInstallStep ? (
          <div className="w-full flex flex-col gap-3">
            {deferredPrompt ? (
              <button
                onClick={triggerInstall}
                className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 active:bg-slate-900 text-white font-semibold py-4 rounded-2xl text-base transition-colors shadow-md shadow-slate-200"
              >
                <Download className="h-5 w-5" />
                Jetzt installieren
              </button>
            ) : (
              <button
                onClick={finish}
                className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 active:bg-slate-900 text-white font-semibold py-4 rounded-2xl text-base transition-colors shadow-md shadow-slate-200"
              >
                <CheckCircle2 className="h-5 w-5" />
                Verstanden, los geht's
              </button>
            )}
            <button
              onClick={finish}
              className="text-slate-400 text-sm hover:text-slate-600 transition-colors"
            >
              Vielleicht später
            </button>
          </div>
        ) : (
          <button
            onClick={next}
            className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-900 active:bg-slate-900 text-white font-semibold py-4 rounded-2xl text-base transition-colors shadow-md shadow-slate-200"
          >
            {step < totalSteps - 1 ? (
              <>Weiter <ChevronRight className="h-5 w-5" /></>
            ) : (
              <>Los geht's <CheckCircle2 className="h-5 w-5" /></>
            )}
          </button>
        )}

        {/* Skip */}
        {step < totalSteps - 1 && !isInstallStep && (
          <button
            onClick={finish}
            className="text-slate-400 text-sm hover:text-slate-600 transition-colors"
          >
            Überspringen
          </button>
        )}
      </div>
    </div>
  );
}
