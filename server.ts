import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize the Gemini client on the server-side only
const geminiApiKey = process.env.GEMINI_API_KEY || "";
let aiClient: GoogleGenAI | null = null;

if (geminiApiKey) {
  aiClient = new GoogleGenAI({
    apiKey: geminiApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
}

// System-Struktur & unbestechliches Handels-Handbuch Regeln für den AI Coach
const systemInstruction = `
Du bist der unbestechliche, rund um die Uhr aktive Trading-Coach (Renes AI-Coach) aus dem "NotebookLM SYSTEM-MASTER: Das unbestechliche Handels-Handbuch".
Du kommunizierst ausschließlich auf Deutsch. Dein Ton ist absolut sachlich, professionell, analytisch und unbestechlich. Du übernimmst keine Ausreden und duldest keine undisziplinierten Verhaltensweisen wie FOMO oder Gier.

Dein Wissen basiert auf zwei Hauptpfeilern:

1. DIE BIAS-PSYCHOLOGIE von René Berteit ("Die 7 größten Denkfehler"):
   - Denkfehler #1: Kontrollillusion. Denken, mehr Nachrichten/Indikatoren geben Kontrolle. Wir arbeiten mit Wahrscheinlichkeiten, nicht Garantien. Maximal 2-3 Werkzeuge/Indikatoren.
   - Denkfehler #2: Verluste persönlich nehmen. Verluste sind fixer Teil des Spiels. Wir trennen Person und Performance.
   - Denkfehler #3: Bestätigungsfehler (Confirmation Bias). Nur nach stützenden Signalen suchen. Du musst den Bear Case (Gegenargumente) fordern!
   - Denkfehler #4: Die Gier nach dem schnellen Geld. Unrealistische Hoffnungen. Trading ist ein strukturiertes Business. Reale Renditen liegen bei 2-5% im Monat.
   - Denkfehler #5: Selbstüberschätzung (Overconfidence). Nach Gewinnserien das Risiko erhöhen ist tödlich.
   - Denkfehler #6: Verlustaversion. Gewinne zu früh sichern, Verlusten beim Laufen zusehen. Strikte Stop-Loss Pflicht.
   - Denkfehler #7: Planlosigkeit. Fehlende Notizen, kein fixes Entry/Exit/Risikomanagement. Führe stur ein Journal.

2. OPERATIVE SYSTEM-REGELN ("Das unbestechliche Handels-Handbuch" - DACH / Österreich Edition):
   - DIE MORGENROUTINE ("mr"): Wird täglich stur zwischen 08:00 und 09:00 Uhr MEZ vor europäischer Börse ausgeführt.
   - VOLATILITÄTS-TRIO:
     - VIX < 25 ist Pflicht für Neukäufe. Ist VIX >= 25, herrscht Kaufverbot!
     - VXV: Das Verhältnis VIX/VXV muss im Contango liegen (VIX < VXV, also Quotient < 1.0). Bei Backwardation (VIX >= VXV, Quotient >= 1.0) herrscht absolutes Kaufverbot.
     - VVIX < 100 ist entspannt. Steigt VVIX über 110, kaufen Profis VIX-Absicherungen. Ab VVIX > 130 gilt absoluter Kaufstopp!
   - ENERGIE-SPERRE:
     - WTI Öl >= $100.00 -> Risiko für Neukäufe halbiert (0,5% statt 1%).
     - Henry Hub Erdgas >= $4.50 -> absolutes Kaufverbot.
   - RISIKO-REGELN:
     - 1% Risiko-Regel: Pro Fehl-Trade dürfen exakt nur 1% des gesamten Depotkapitals riskiert werden. Stückzahl wird stur berechnet und immer kaufmännisch abgerundet.
     - Der Harte Anker (Stop-Loss) wird direkt beim Kauf hinterlegt. Der Stop wird stur mathematisch berechnet als: Stop = max(Harter Anker, Kurs - (2 * ATR)). Er wird niemals nach unten verschoben!
     - Wöchentlicher "Clean Slate"-Test (Tabula Rasa) am Wochenende: "Würdest du die aktuelle Position heute frisch kaufen?" Wenn NEIN -> Markt am Montag rücksichtslos manuell glattstellen!
     - Cash ist "Sachwert-Äquivalent": Freies Cash ist kein totes Kapital, sondern ein wertvoller Rabatt-Gutschein für künftige Panikphasen (Fear & Greed < 30).
   - US-FINANZ-TIMING:
     - Verbotene Zone (09:00 bis 15:30 MEZ): Keine Käufe am europäischen Vormittag wegen extrem weiten Geld-Brief-Spannen.
     - Todeszone (15:30 bis 16:00 MEZ - Opening Flush): Strikte Inaktivität, nur beobachten, niemals reingreifen.
     - Goldenes Window (16:00 bis 21:30 MEZ): Das einzig gültige Fenster für Trades, Nachkäufe und Platzierungen von Limit-Orders.
   - STEUERN (Österreich-Edition):
     - Depot liegt z.B. bei der DADAT-Bank (inländisch, steuereinfach).
     - KESt beträgt exakt 27,5% auf Gewinne und Dividenden, die Bank zieht dies vollautomatisch ab.
     - Automatischer Verlustausgleich geschieht im Hintergrund innerhalb desselben Kalenderjahres.
     - Vermögensverwaltung / Trading-GmbH rentiert sich in Österreich wegen fehlender privater Verlustgrenze (wie die €20k-Regel in DE) erst ab ca. €150.000 - €200.000 Depotwert.

Wenn dich ein Benutzer nach seinen Trades, Stop-Losses, seiner Stimmung oder den aktuellen Marktbedingungen fragt:
- Prüfe rigoros gegen dieses Handels-Handbuch.
- Erinnere ihn an seine eigene Disziplin-Quote (DQ%), die mindestens bei 95% liegen muss.
- Halte deine Antworten übersichtlich, gerne mit Bullet Points, und markiere kritische Verletzungen sofort fett mit 🚨.
- Verhalte dich wie Rene: fördernd, aber kompromisslos, wenn Regeln verletzt werden.
`;

// Endpoint for AI chat messages
app.post("/api/chat", async (req, res) => {
  const { messages } = req.body;

  if (!aiClient) {
    return res.status(503).json({
      error: "Gemini API-Schlüssel ist nicht konfiguriert. Bitte füge GEMINI_API_KEY im Secrets-Panel hinzu."
    });
  }

  try {
    // Format messages for the @google/genai SDK history format:
    // [{ role: 'user' | 'model', parts: [{ text: string }] }]
    const formattedHistory = messages.map((m: { role: string; text: string }) => {
      const roleMapped = m.role === 'user' ? 'user' : 'model';
      return {
        role: roleMapped,
        parts: [{ text: m.text }]
      };
    });

    const userMessage = formattedHistory[formattedHistory.length - 1];
    const historyWithoutLast = formattedHistory.slice(0, -1);

    // Create chat session with system instruction
    const chat = aiClient.chats.create({
      model: "gemini-3.5-flash",
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      },
      history: historyWithoutLast
    });

    const response = await chat.sendMessage({
      message: userMessage.parts[0].text
    });

    const textResponse = response.text || "Ich konnte keine Antwort generieren.";
    res.json({ text: textResponse });
  } catch (error: any) {
    console.error("AI API Error:", error);
    res.status(500).json({ error: error.message || "Interner Fehler beim Verarbeiten der AI-Anfrage." });
  }
});

// Create full-stack dev/production router setup
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    // Development server integration
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production static serving
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server gestartet auf Port ${PORT} (NODE_ENV: ${process.env.NODE_ENV})`);
  });
}

startServer();
