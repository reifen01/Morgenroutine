import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

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

// OAuth Popup Callback Endpoint to handle and transmit Google Workspace credentials
app.get(["/auth/callback", "/auth/callback/"], (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="de">
      <head>
        <meta charset="UTF-8">
        <title>Google Authentifizierung erfolgreich</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
            background-color: #f8fafc;
            color: #0f172a;
            text-align: center;
          }
          .card {
            background: white;
            padding: 2.5rem;
            border-radius: 1.5rem;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
            max-width: 400px;
          }
          h1 { font-size: 1.25rem; margin-bottom: 0.5rem; color: #4338ca; }
          p { font-size: 0.875rem; color: #64748b; }
          .spinner {
            border: 3px solid #f3f3f3;
            border-top: 3px solid #4338ca;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            animation: spin 1s linear infinite;
            margin: 1.5rem auto 0 auto;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        </style>
      </head>
      <body>
        <div class="card">
          <h1>Anmeldung erfolgreich!</h1>
          <p>Übergebe Autorisierungs-Schlüssel an die App...</p>
          <div class="spinner"></div>
        </div>
        <script>
          if (window.opener) {
            // Send OAuth token block (hash payload) back to main app
            window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', hash: window.location.hash }, '*');
            setTimeout(() => {
              window.close();
            }, 800);
          } else {
            window.location.href = '/';
          }
        </script>
      </body>
    </html>
  `);
});

// ==========================================
// CENTRAL PROFILE LOCKBOX / ACCESS-TOOL CONTROLLER
// ==========================================
interface ProfilePayload {
  clientId: string;
  spreadsheetId: string;
  documentId: string;
  folderId: string;
}

let cloudProfiles: Record<string, { pin: string; payload: ProfilePayload }> = {};

const PROFILES_FILE = path.join(process.cwd(), "cloud_profiles.json");

// Load existing profiles from file if present on boot
try {
  if (fs.existsSync(PROFILES_FILE)) {
    const rawData = fs.readFileSync(PROFILES_FILE, "utf-8");
    cloudProfiles = JSON.parse(rawData);
    console.log("🟢 Central Access Box: Loaded cloud profiles:", Object.keys(cloudProfiles));
  }
} catch (err) {
  console.error("⚠️ Central Access Box: Could not read cloud_profiles.json - using in-memory backup:", err);
}

const saveProfilesToFile = () => {
  try {
    fs.writeFileSync(PROFILES_FILE, JSON.stringify(cloudProfiles, null, 2), "utf-8");
  } catch (err) {
    console.error("⚠️ Central Access Box: Could not write cloud_profiles.json - in-memory only:", err);
  }
};

// Endpoint to securely store a profile with PIN
app.post("/api/profiles/save", (req, res) => {
  const { name, pin, payload } = req.body;
  if (!name || !pin || !payload) {
    return res.status(400).json({ error: "Fehlende Parameter: Verbindungsname, PIN und Daten-Id-Set erforderlich." });
  }

  const normalizedName = name.trim().toLowerCase();

  // If profile already exists, verify pin!
  if (cloudProfiles[normalizedName]) {
    if (cloudProfiles[normalizedName].pin !== pin.trim()) {
      return res.status(403).json({ error: "Dieses Profil existiert bereits und ist mit einer anderen PIN geschützt." });
    }
  }

  cloudProfiles[normalizedName] = {
    pin: pin.trim(),
    payload: {
      clientId: payload.clientId || "",
      spreadsheetId: payload.spreadsheetId || "",
      documentId: payload.documentId || "",
      folderId: payload.folderId || ""
    }
  };

  saveProfilesToFile();

  res.json({ success: true, message: `Profil "${name}" erfolgreich gesichert.` });
});

// Endpoint to retrieve a profile using PIN
app.post("/api/profiles/load", (req, res) => {
  const { name, pin } = req.body;
  if (!name || !pin) {
    return res.status(400).json({ error: "Verbindungsname und PIN sind erforderlich." });
  }

  const normalizedName = name.trim().toLowerCase();
  const profile = cloudProfiles[normalizedName];

  if (!profile) {
    return res.status(404).json({ error: `Keine Zugangsdaten unter dem Namen "${name}" gefunden. Prüfe Groß-/Kleinschreibung.` });
  }

  if (profile.pin !== pin.trim()) {
    return res.status(403).json({ error: "Ungültige PIN für dieses Profil. Zugriff verweigert!" });
  }

  res.json({ success: true, payload: profile.payload });
});


// ==========================================
// SCREENSHOT VISION PARSER ENDPOINT
// ==========================================
app.post("/api/parse-screenshot", async (req, res) => {
  const { imageBase64 } = req.body;

  if (!aiClient) {
    return res.status(503).json({
      error: "Gemini API-Schlüssel ist nicht konfiguriert oder aktiv. Bitte stelle sicher, dass GEMINI_API_KEY im Secrets-Panel eingepflegt wurde."
    });
  }

  if (!imageBase64) {
    return res.status(400).json({ error: "Keine Bilddaten (Base64) übermittelt." });
  }

  try {
    // Robust base64 stripping and sanitization
    let cleanBase64 = imageBase64;
    let mimeType = "image/png";

    if (typeof imageBase64 === "string") {
      const commaIndex = imageBase64.indexOf(",");
      if (commaIndex !== -1 && imageBase64.startsWith("data:")) {
        const header = imageBase64.substring(0, commaIndex);
        cleanBase64 = imageBase64.substring(commaIndex + 1);
        const mimeMatch = header.match(/data:([^;]+);/);
        if (mimeMatch) {
          mimeType = mimeMatch[1];
        }
      }
      // Re-assure all whitespaces, tabs, and newlines are completely stripped!
      cleanBase64 = cleanBase64.replace(/[\s\r\n]+/g, "");
    }

    const imagePart = {
      inlineData: {
        mimeType: mimeType,
        data: cleanBase64,
      },
    };

    const textPart = {
      text: `You are an extremely precise and clever financial data OCR agent. Analyze this watchlist, broker screenshot (often compiled in German/LS/Trade Republic or trading platforms) and extract the values for specific indices and stock tickers.

CRITICAL MAPPING DICTIONARY (GERMAN & ENGLISH TRADING CODES):
1. 'vix': CBOE Volatility Index. Labeled as: "VIX", "VIX Index", "CBOE Volatility Index", "VOLATILITÄTSINDEX S&P 500". Typical value: 10.0 to 45.0.
2. 'vxv': VXV or CBOE S&P 500 3-Month Volatility Index. Labeled as: "VXV", "VXVCLS", "S&P 500 3-MONTH VOLATILITY INDEX". Typical value: 12.0 to 45.0.
3. 'vvix': VVIX or CBOE VIX Volatility Index. Labeled as: "VVIX", "CBOE VIX VOLATILITY", "VVIX Index". Typical value: 70.0 to 160.0.
4. 'spx': S&P 500 Index. Labeled as: "S&P 500", "SPX", "S&P500 Index". Typical value: 4000.0 to 8000.0.
5. 'wti': WTI Crude Oil price per barrel. Labeled as: "WTI Crude Oil", "WTI", "Crude Oil", "WEST TEXAS INTERMEDIATE". Typical value: $60.00 to $120.00.
6. 'gas': Henry Hub Natural Gas spot price. Labeled as: "NG1!", "NG1! D", "Erdgas-Futures", "Erdgas", "Natural Gas", "Gas Futures".
   CRITICAL FOR GAS: Natural Gas spot price is a small decimal, typically between 1.10 and 8.00 USD (e.g., 3.333 or 2.155). It is NEVER a large number like 1000 or -1.000 or 1.00! Ignore daily absolute percentage or points changes like "-1,000" or "-0,91%" and find the proper price.
7. 'tsla': Tesla, Inc. stock price. Labeled as: "TSLA", "TESLA", "TL0" (German ticker TL0), "TLO" (common German typo). Typical stock price: €100.00 to €500.00 / $100.00 to $500.00.
8. 'now': ServiceNow, Inc. Labeled as: "NOW", "SERVICENOW", "4S0" (German ticker 4S0), "4S0 L", "4S0L". Typical stock price: €300.00 to €1100.00.
9. 'baba': Alibaba Group Holding. Labeled as: "AHLA" (German ticker AHLA on Tradegate), "BABA", "ALIBABA". Typical stock price: €50.00 to €200.00.
10. 'btc': Bitcoin. Labeled as: "BTC", "BTCEUR", "BTC-EUR", "BTC Index", "Bitcoin Tracker Index", "Bitcoin". Typical price: €40000.0 to €150000.0.

NUMBER FORMATTING & MULTI-LANGUAGE CONSTRAINTS:
1. German/European formats are frequently used in user screenshots, where a comma (',') is used for the decimal part and a period ('.') is used as the thousands separator.
   - For example: '3,333' means 3.333 (three point three three three). You must return this as the number 3.333.
   - '15,39' means 15.39.
   - '7.593,53' means 7593.53.
   - '55.008,37' means 55008.37.
2. Carefully avoid reading the absolute or relative price change lines (which start with '+' or '-' or end with '%', e.g., '+0,119', '+3,70%', '-1,000', '-0,91%'). Always extract the actual primary price of the asset.
3. If any field is missing, not visible, or unreadable, omit it from the JSON. DO NOT invent or guess values.
4. Return ONLY a valid JSON object matching the requested schema.`,
    };

    let response: any;
    const modelsToTry = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-flash-latest"];
    let lastError: any = null;

    for (let currentAttempt = 1; currentAttempt <= modelsToTry.length; currentAttempt++) {
      const selectedModel = modelsToTry[currentAttempt - 1];
      try {
        console.log(`[Screenshot OCR API] Starte Analyse mit Modell: ${selectedModel} (Versuch ${currentAttempt}/${modelsToTry.length})`);
        
        const generatePromise = aiClient.models.generateContent({
          model: selectedModel,
          contents: { parts: [imagePart, textPart] },
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                vix: { type: Type.NUMBER, description: "Der ausgelesene VIX-Wert (z.B. 14.52)." },
                vxv: { type: Type.NUMBER, description: "Der ausgelesene VXV-Wert (z.B. 16.10)." },
                vvix: { type: Type.NUMBER, description: "Der ausgelesene VVIX-Wert (z.B. 82.40)." },
                spx: { type: Type.NUMBER, description: "Der ausgelesene SPX / S&P 500 Wert (z.B. 5130.20)." },
                wti: { type: Type.NUMBER, description: "Der ausgelesene WTI Rohölpreis (z.B. 78.50)." },
                gas: { type: Type.NUMBER, description: "Der ausgelesene Henry Hub Erdgaspreis (z.B. 2.155)." },
                tsla: { type: Type.NUMBER, description: "Der ausgelesene Tesla Aktienkurs (z.B. 175.30 or German ticker TL0 price)." },
                now: { type: Type.NUMBER, description: "Der ausgelesene ServiceNow Aktienkurs (z.B. 730.40 or German ticker 4S0 price)." },
                baba: { type: Type.NUMBER, description: "Der ausgelesene Alibaba Aktienkurs (z.B. 72.10 or German ticker AHLA price)." },
                btc: { type: Type.NUMBER, description: "Der ausgelesene Bitcoin Kurs (z.B. 67500)." },
              }
            },
          }
        });

        const timeoutPromise = new Promise<any>((_, reject) => {
          setTimeout(() => reject(new Error("Timeout bei der Modellgenerierung (7.5s)")), 7500);
        });

        response = await Promise.race([generatePromise, timeoutPromise]);
        break; // Success, exit loop
      } catch (err: any) {
        lastError = err;
        console.warn(`[Screenshot OCR API] Versuch mit Modell ${selectedModel} gescheitert:`, err.message || err);
        if (currentAttempt === modelsToTry.length) {
          throw err; // Out of models to try, throw final error
        }
        // Shorter delay of 500ms before falling back to next model to keep the UI snappy
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    const responseText = response.text || "{}";
    console.log("Parsed visual screen results:", responseText);
    res.json(JSON.parse(responseText));
  } catch (error: any) {
    console.error("Screenshot Parser Error:", error);
    res.status(500).json({ error: error.message || "Fehler beim Auslesen des Screenshots durch die KI." });
  }
});


// Predefined local dictionary of common stocks to provide a robust, rate-limit-free fallback
interface LocalStock {
  symbol: string;
  name: string;
  price: string;
  atr: string;
  isin?: string;
  wkn?: string;
}

const STOCK_DICTIONARY: LocalStock[] = [
  { symbol: "AAPL", name: "Apple Inc.", price: "195.50", atr: "4.80", isin: "US0378331005", wkn: "865985" },
  { symbol: "TSLA", name: "Tesla Inc.", price: "178.50", atr: "7.50", isin: "US88160R1014", wkn: "A1CX3T" },
  { symbol: "NVDA", name: "NVIDIA Corporation", price: "121.00", atr: "5.20", isin: "US67066G1040", wkn: "918422" },
  { symbol: "MSFT", name: "Microsoft Corp.", price: "415.00", atr: "8.50", isin: "US5949181045", wkn: "870747" },
  { symbol: "AMZN", name: "Amazon.com Inc.", price: "185.00", atr: "4.10", isin: "US0231351067", wkn: "906866" },
  { symbol: "GOOGL", name: "Alphabet Inc. (Google)", price: "175.00", atr: "3.80", isin: "US02079K1079", wkn: "A14Y6H" },
  { symbol: "META", name: "Meta Platforms Inc.", price: "475.00", atr: "12.50", isin: "US30303M1027", wkn: "A1JWVX" },
  { symbol: "NFLX", name: "Netflix Inc.", price: "650.00", atr: "15.00", isin: "US64110L1061", wkn: "552484" },
  { symbol: "AMD", name: "Advanced Micro Devices", price: "160.00", atr: "6.20", isin: "US0079031075", wkn: "863186" },
  { symbol: "MBG", name: "Mercedes-Benz Group AG", price: "64.50", atr: "1.80", isin: "DE0007100000", wkn: "710000" },
  { symbol: "BMW", name: "Bayerische Motoren Werke AG", price: "92.00", atr: "2.10", isin: "DE0005190003", wkn: "519000" },
  { symbol: "SAP", name: "SAP SE", price: "180.00", atr: "3.50", isin: "DE0007164600", wkn: "716460" },
  { symbol: "ALV", name: "Allianz SE", price: "260.00", atr: "4.50", isin: "DE0008404005", wkn: "840400" },
  { symbol: "BAYN", name: "Bayer AG", price: "26.50", atr: "0.95", isin: "DE000BAY0017", wkn: "BAY001" },
  { symbol: "SIE", name: "Siemens AG", price: "170.10", atr: "3.80", isin: "DE0007236101", wkn: "723610" },
  { symbol: "BAS", name: "BASF SE", price: "46.50", atr: "1.10", isin: "DE000BASF111", wkn: "BASF11" },
  { symbol: "VOW3", name: "Volkswagen AG Vz.", price: "110.00", atr: "2.20", isin: "DE0007664039", wkn: "766403" },
  { symbol: "DTE", name: "Deutsche Telekom AG", price: "22.50", atr: "0.45", isin: "DE0005557508", wkn: "555750" },
  { symbol: "CBK", name: "Commerzbank AG", price: "14.20", atr: "0.35", isin: "DE000CBK1001", wkn: "CBK100" },
  { symbol: "DBK", name: "Deutsche Bank AG", price: "15.10", atr: "0.45", isin: "DE0005140008", wkn: "514000" },
  { symbol: "RHM", name: "Rheinmetall AG", price: "520.00", atr: "14.50", isin: "DE0007030009", wkn: "703000" },
  { symbol: "ADS", name: "Adidas AG", price: "225.00", atr: "5.50", isin: "DE000A1EWWW0", wkn: "A1EWWW" },
  { symbol: "PUM", name: "Puma SE", price: "48.00", atr: "1.20", isin: "DE0006969603", wkn: "696960" },
  { symbol: "IFX", name: "Infineon Technologies AG", price: "36.50", atr: "1.15", isin: "DE0006231004", wkn: "623100" },
  { symbol: "MUV2", name: "Münchener Rückversicherungs-Gesellschaft (Munich Re)", price: "450.00", atr: "8.50", isin: "DE0008430026", wkn: "843002" },
  { symbol: "RWE", name: "RWE AG", price: "34.00", atr: "0.95", isin: "DE0007037129", wkn: "703712" },
  { symbol: "EOAN", name: "E.ON SE", price: "12.50", atr: "0.25", isin: "DE000ENAG999", wkn: "ENAG99" },
  { symbol: "DHL", name: "DHL Group (Deutsche Post)", price: "38.50", atr: "0.90", isin: "DE0005552004", wkn: "555200" },
  { symbol: "HEI", name: "Heidelberg Materials AG", price: "96.00", atr: "2.10", isin: "DE0006047004", wkn: "604700" },
  { symbol: "BNR", name: "Brenntag SE", price: "75.20", atr: "1.60", isin: "DE000A1DAHH0", wkn: "A1DAHH" },
  { symbol: "BEI", name: "Beiersdorf AG", price: "142.05", atr: "2.30", isin: "DE0005200000", wkn: "520000" },
  { symbol: "HEN3", name: "Henkel AG & Co. KGaA Vz.", price: "82.30", atr: "1.40", isin: "DE0006048432", wkn: "604843" },
  { symbol: "SY1", name: "Symrise AG", price: "112.50", atr: "2.10", isin: "DE000SYM9999", wkn: "SYM999" },
  { symbol: "QIA", name: "Qiagen N.V.", price: "41.20", atr: "1.05", isin: "NL0012169213", wkn: "A2DKCH" },
  { symbol: "MRK", name: "Merck KGaA", price: "165.00", atr: "3.50", isin: "DE0006599905", wkn: "659990" },
  { symbol: "FRE", name: "Fresenius SE & Co. KGaA", price: "28.50", atr: "0.65", isin: "DE0005785604", wkn: "578560" },
  { symbol: "SRT3", name: "Sartorius AG Vz.", price: "280.00", atr: "9.00", isin: "DE0007165631", wkn: "716563" },
  { symbol: "VNA", name: "Vonovia SE", price: "27.50", atr: "0.75", isin: "DE000A1ML7J1", wkn: "A1ML7J" },
  { symbol: "BTC", name: "Bitcoin / Euro (BTC)", price: "68500.00", atr: "2500.00", isin: "XC000A2YY636", wkn: "A2YY63" },
  { symbol: "ETH", name: "Ethereum (ETH)", price: "3500.00", atr: "120.00", isin: "XC000A2YY644", wkn: "A2YY64" },
  { symbol: "BABA", name: "Alibaba Group Holding Ltd.", price: "80.50", atr: "2.15", isin: "US01609W1027", wkn: "A117ME" },
  { symbol: "ASML", name: "ASML Holding N.V.", price: "950.00", atr: "22.00", isin: "NL0010273415", wkn: "A1J4U4" },
  { symbol: "LLY", name: "Eli Lilly and Company", price: "820.00", atr: "18.00", isin: "US5324571083", wkn: "858567" },
  { symbol: "NOVO", name: "Novo Nordisk A/S", price: "135.00", atr: "3.20", isin: "DK0062498110", wkn: "A3EU6F" }
];

// Memory efficient search caches to avoid duplicate AI lookups
const searchCache = new Map<string, any[]>();
let lastRateLimitTime = 0; // Timestamp of when a 429 occurred
const RATE_LIMIT_COOLDOWN_MS = 300000; // 5 minute cooldown to preserve quota

// Server-side cache for distribution days (since these values only change once a day)
let cachedDistDays: { distSpx: number; distNdx: number; reasoning: string; date: string } | null = null;

interface TradingDay {
  dateStr: string;
  close: number;
  volume: number;
}

interface DistResult {
  count: number;
  identifiedDays: { dateStr: string; close: number; priorClose: number; changePct: string; volUp: boolean }[];
}

async function fetchYahooData(symbol: string): Promise<TradingDay[]> {
  const urls = [
    `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=45d`,
    `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=45d`
  ];
  
  let lastError: any = null;
  for (const url of urls) {
    try {
      console.log(`[Yahoo Finance] Fetching data for ${symbol} from url: ${url}`);
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36"
        }
      });
      if (!response.ok) {
        throw new Error(`HTTP-Error: ${response.status}`);
      }
      const data = await response.json() as any;
      const result = data?.chart?.result?.[0];
      if (!result) {
        throw new Error("Invalid response format: No chart result found");
      }
      
      const timestamps = result.timestamp || [];
      const quote = result.indicators?.quote?.[0] || {};
      const closes = quote.close || [];
      const volumes = quote.volume || [];
      
      const days: TradingDay[] = [];
      for (let i = 0; i < timestamps.length; i++) {
        const c = closes[i];
        const v = volumes[i];
        const t = timestamps[i];
        
        if (c !== null && c !== undefined && v !== null && v !== undefined && t !== null && t !== undefined) {
          const dateObj = new Date(t * 1000);
          const dateStr = dateObj.toISOString().split("T")[0];
          days.push({
            dateStr,
            close: Number(c),
            volume: Number(v)
          });
        }
      }
      
      if (days.length === 0) {
        throw new Error("No trading days parsed from response");
      }
      
      days.sort((a, b) => a.dateStr.localeCompare(b.dateStr));
      return days;
    } catch (err: any) {
      console.warn(`[Yahoo Finance] Fetch for ${symbol} failed on ${url}:`, err.message || err);
      lastError = err;
    }
  }
  throw lastError || new Error(`Failed to fetch Yahoo data for ${symbol}`);
}

function calculateDistributionDays(days: TradingDay[], len: number = 25): DistResult {
  const calculatedDaysStatus: { dateStr: string; isDist: boolean; close: number; priorClose: number; changePct: string; volUp: boolean }[] = [];
  
  for (let i = 1; i < days.length; i++) {
    const today = days[i];
    const prior = days[i - 1];
    
    const isDownBar = today.close < prior.close * 0.998;
    const isVolumeUp = today.volume > prior.volume;
    const isDist = isDownBar && isVolumeUp;
    
    const changePct = ((today.close - prior.close) / prior.close * 100).toFixed(2);
    
    calculatedDaysStatus.push({
      dateStr: today.dateStr,
      isDist,
      close: today.close,
      priorClose: prior.close,
      changePct: `${changePct}%`,
      volUp: isVolumeUp
    });
  }
  
  // Pine Script evaluates last len+1 bars (inclusive of today)
  const lastDays = calculatedDaysStatus.slice(-(len + 1));
  
  let count = 0;
  const identifiedDays: any[] = [];
  for (const day of lastDays) {
    if (day.isDist) {
      count++;
      identifiedDays.push({
        dateStr: day.dateStr,
        close: day.close,
        priorClose: day.priorClose,
        changePct: day.changePct,
        volUp: day.volUp
      });
    }
  }
  
  return {
    count,
    identifiedDays
  };
}

// Endpoint to calculate the distribution days dynamically using Gemini Search Grounding
app.post("/api/calculate-distribution-days", async (req, res) => {
  const currentDateStr = new Date().toISOString().split('T')[0];

  // 1. Check if we have a valid cache for today
  if (cachedDistDays && cachedDistDays.date === currentDateStr) {
    console.log("[Distribution Days API] Serving cached distribution days for today:", cachedDistDays);
    return res.json({
      distSpx: cachedDistDays.distSpx,
      distNdx: cachedDistDays.distNdx,
      reasoning: `${cachedDistDays.reasoning} (Werte für heute geladen aus dem Server-Cache)`
    });
  }

  // 2. Try the perfect, programmatic, key-less Yahoo Finance approach first
  try {
    console.log("[Distribution Days API] Attempting precise programmatic calculation via Yahoo Finance (SPY & QQQ)...");
    const spyData = await fetchYahooData("SPY");
    const qqqData = await fetchYahooData("QQQ");
    
    const spyCalc = calculateDistributionDays(spyData, 25);
    const qqqCalc = calculateDistributionDays(qqqData, 25);
    
    const spyText = spyCalc.identifiedDays.map(d => `${d.dateStr} (${d.changePct})`).join(', ');
    const qqqText = qqqCalc.identifiedDays.map(d => `${d.dateStr} (${d.changePct})`).join(', ');
    
    const reasoning = `Präzise berechnet anhand historischer Kurs- und Volumendaten der letzten 25 Handelstage (boomerberg Algorithmus):
• S&P 500 (SPY): ${spyCalc.count} Verteilungstage [${spyText || 'Keine signifikanten Verteilungstage'}].
• Nasdaq 100 (QQQ): ${qqqCalc.count} Verteilungstage [${qqqText || 'Keine signifikanten Verteilungstage'}].
Definition: Tagesschlusskurs fällt um mindestens -0,2% bei steigendem Volumen im Vergleich zum Vortag.`;

    const finalResult = {
      distSpx: spyCalc.count,
      distNdx: qqqCalc.count,
      reasoning
    };
    
    // Save to server-side cache
    cachedDistDays = {
      distSpx: spyCalc.count,
      distNdx: qqqCalc.count,
      reasoning,
      date: currentDateStr
    };
    
    console.log("[Distribution Days API] Programmatic calculation succeeded:", finalResult);
    return res.json(finalResult);
  } catch (programmaticError: any) {
    console.warn("[Distribution Days API] Programmatic calculation failed or rate limited, falling back to Gemini:", programmaticError.message || programmaticError);
  }

  // 3. Fallback: Check if we are in a cooldown period due to recent 429 API quota errors
  if (!aiClient) {
    return res.json({
      distSpx: 2,
      distNdx: 3,
      reasoning: "Hinweis: Gemini-API-Schlüssel ist nicht konfiguriert. Programmatische Ermittlung schlug fehl. Es wurden plausible Schätzwerte eingetragen."
    });
  }

  const timeSinceLast429 = Date.now() - lastRateLimitTime;
  if (lastRateLimitTime > 0 && timeSinceLast429 < RATE_LIMIT_COOLDOWN_MS) {
    console.log(`[Distribution Days API] Cooldown active due to prior 429. Returning baseline defaults.`);
    return res.json({
      distSpx: 2,
      distNdx: 3,
      reasoning: "Hinweis: Die automatische AI-Ermittlung befindet sich vorübergehend im Quoten-Schonmodus (5 Min. Cooldown nach RESOURCE_EXHAUSTED). Es wurden plausible Schätzwerte (S&P 500: 2, Nasdaq: 3) eingetragen, um Quoten zu sparen. Bitte passe diese ggf. manuell an."
    });
  }

  // 4. Try Gemini AI Search Grounding
  try {
    console.log("[Distribution Days API] Starte automatische Ermittlung mit Gemini Search Grounding...");
    
    const prompt = `Du bist ein hochentwickelter Trading-Datenanalyst. Deine Aufgabe ist es, die exakten "Distribution Days" (Verteilungstage) der letzten 25 Handelstage für den S&P 500 Index (SPX oder SPY) und für den Nasdaq 100 Index (NDX oder QQQ) zu ermitteln. Das heutige Referenzdatum ist: ${currentDateStr}.

Bitte benutze die Google-Suche (Search Grounding), um das tägliche historische Kurs- und volumen-Pattern der letzten 25 Handelstage für den S&P 500 (SPX/SPY) und den Nasdaq 100 (NDX/QQQ) zu recherchieren.

Definition eines "Distribution Day" (Verteilungstages) nach IBD / dem unbestechlichen Handels-Handbuch:
Ein Tag ist ein Distributionstag, wenn:
1. Der Close-Kurs des Index im Vergleich zum Vortag fällt (typischerweise um mindestens -0,2 %, d. h. heute_close / vortag_close <= 0.998).
2. Das Handelsvolumen dieses Tages HÖHER ist als das Handelsvolumen des Vortages (heute_volumen > vortag_volumen).

Berechne die Gesamtanzahl (Integer) der Distributionstage in den letzten 25 Handelstagen sowohl für den S&P 500 als auch für den Nasdaq 100.
Falls du verifizierte Statistiken (z.B. von Investor's Business Daily (IBD) oder bekannten Market-Update-Seiten zur Verteilungsstatistik im laufenden Monat Juni 2026 bzw. für die letzten 25 Handelstage) findest, darfst du dich gerne darauf stützen.

Gib das Ergebnis ausschließlich als valides JSON-Objekt im folgenden Format zurück:
{
  "distSpx": <Anzahl als Integer, z.B. 3>,
  "distNdx": <Anzahl als Integer, z.B. 4>,
  "reasoning": "<Eine kurze, übersichtliche Beschreibung in klarem Deutsch, welche konkreten Verlegungstage bzw. Termine identifiziert wurden (z. B. '6. Juni (SPX im Minus bei steigendem Volumen)...') und wie das Endergebnis lautet.>"
}`;

    const response = await aiClient.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            distSpx: { type: Type.INTEGER, description: "Die Anzahl der identifizierten Distribution Days für den S&P 500 in den letzten 25 Handelstagen." },
            distNdx: { type: Type.INTEGER, description: "Die Anzahl der identifizierten Distribution Days für den Nasdaq 100 in den letzten 25 Handelstagen." },
            reasoning: { type: Type.STRING, description: "Eine verständliche Erklärung auf Deutsch mit den identifizierten Tagen und Volumenänderungen." }
          },
          required: ["distSpx", "distNdx", "reasoning"]
        }
      }
    });

    const textOutput = response.text || "{}";
    const data = JSON.parse(textOutput);
    console.log("[Distribution Days API] Erfolgreich per AI ermittelt:", data);

    cachedDistDays = {
      distSpx: typeof data.distSpx === "number" ? data.distSpx : 2,
      distNdx: typeof data.distNdx === "number" ? data.distNdx : 3,
      reasoning: data.reasoning || "Erfolgreich ermittelt.",
      date: currentDateStr
    };

    res.json(data);
  } catch (error: any) {
    console.warn("[Distribution Days API] Primary Google Search evaluation failed or rate/quota limited:", error.message || error);
    
    const isRateLimit = error.message?.includes("429") || 
                        error.message?.includes("quota") || 
                        error.message?.includes("RESOURCE_EXHAUSTED") || 
                        (error.status && error.status === 429);
    
    if (isRateLimit) {
      lastRateLimitTime = Date.now();
    }

    try {
      console.log("[Distribution Days API] Invoking standard fallback mode without Google Search grounding...");
      const fallbackPrompt = `Du bist ein hochentwickelter Trading-Datenanalyst. Deine Aufgabe ist es, die "Distribution Days" (Verteilungstage) der letzten 25 Handelstage für den S&P 500 Index (SPX) und den Nasdaq 100 Index (NDX) schätzungsweise oder anhand deiner Trainingsdaten zu ermitteln. Das heutige Referenzdatum ist: ${currentDateStr}.
      
      HINWEIS: Die Echtzeit-Google-Suche ist wegen API-Quota-Limits deaktiviert. Bitte gib die bestmöglichen, realistischen plausiblen Werte basierend auf deinen Trainingsdaten für den laufenden Zeitraum (Juni 2026 bzw. davor) zurück, oder einen soliden Standardwert (z.B. S&P 500 = 2, Nasdaq = 3) an.
      
      Definition eines "Distribution Day" (Verteilungstages) nach IBD:
      Ein Tag ist ein Distributionstag, wenn:
      1. Der Close-Kurs des Index im Vergleich zum Vortag fällt (um mindestens -0,2%).
      2. Das Handelsvolumen dieses Tages HÖHER ist als das Handelsvolumen des Vortages.
      
      Gib das Ergebnis ausschließlich als valides JSON-Objekt im folgenden Format zurück:
      {
        "distSpx": <Anzahl als Integer>,
        "distNdx": <Anzahl als Integer>,
        "reasoning": "<Eine kurze Beschreibung auf Deutsch. Erwähne kurz, dass dies ein Fallback-Wert auf Basis deiner Trainingsdaten ist, da die Live-Suche das API-Quota überschritten hat.>"
      }`;

      const fallbackResponse = await aiClient.models.generateContent({
        model: "gemini-3.5-flash",
        contents: fallbackPrompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              distSpx: { type: Type.INTEGER, description: "Die Anzahl der identifizierten Distribution Days für den S&P 500." },
              distNdx: { type: Type.INTEGER, description: "Die Anzahl der identifizierten Distribution Days für den Nasdaq 100." },
              reasoning: { type: Type.STRING, description: "Eine Erklärung auf Deutsch darüber, dass dies ein geschätzter Fallback-Wert ist wegen Quotenbeschränkung der Websuche." }
            },
            required: ["distSpx", "distNdx", "reasoning"]
          }
        }
      });

      const fallbackText = fallbackResponse.text || "{}";
      const fallbackData = JSON.parse(fallbackText);
      console.log("[Distribution Days API] Fallback erfolgreich beendet:", fallbackData);
      
      cachedDistDays = {
        distSpx: typeof fallbackData.distSpx === "number" ? fallbackData.distSpx : 2,
        distNdx: typeof fallbackData.distNdx === "number" ? fallbackData.distNdx : 3,
        reasoning: fallbackData.reasoning || "Automatische Schätzung (Ohne Websuche).",
        date: currentDateStr
      };

      return res.json(fallbackData);
    } catch (fallbackError: any) {
      console.warn("[Distribution Days API] Fallback-Ermittlung ebenfalls fehlgeschlagen oder rate limited:", fallbackError.message || fallbackError);
      
      if (fallbackError.message?.includes("429") || 
          fallbackError.message?.includes("quota") || 
          fallbackError.message?.includes("RESOURCE_EXHAUSTED")) {
        lastRateLimitTime = Date.now();
      }

      const baselineDefaults = {
        distSpx: 2,
        distNdx: 3,
        reasoning: `Hinweis: Die automatische AI-Ermittlung konnte wegen API-Quotenbeschränkungen (RESOURCE_EXHAUSTED) nicht vollständig ausgeführt werden. Es wurden temporäre Standard-Schätzwerte (SPX: 2, NDX: 3) eingetragen. Bitte passe diese manuell gem. TradingView an.`
      };
      return res.json(baselineDefaults);
    }
  }
});

// Endpoint for searching stock symbol by query (Name, Ticker, ISIN, or WKN)
app.post("/api/stock-search", async (req, res) => {
  const { query } = req.body;

  if (!query || typeof query !== "string" || !query.trim()) {
    return res.status(400).json({ error: "Keine Suchanfrage übermittelt." });
  }

  const queryNormalized = query.trim().trim().toLowerCase();
  
  // Return from search cache if we've seen this clean query
  if (searchCache.has(queryNormalized)) {
    console.log(`[Cache Hit] Serving search results for "${queryNormalized}"`);
    return res.json(searchCache.get(queryNormalized));
  }

  // 1. Perform local matching in the rich default dictionary first
  const localMatches = STOCK_DICTIONARY.filter(item => {
    return (
      item.symbol.toLowerCase() === queryNormalized ||
      item.symbol.toLowerCase().startsWith(queryNormalized) ||
      item.name.toLowerCase().includes(queryNormalized) ||
      (item.isin && item.isin.toLowerCase().includes(queryNormalized)) ||
      (item.isin && item.isin.toLowerCase().startsWith(queryNormalized)) ||
      (item.wkn && item.wkn.toLowerCase().includes(queryNormalized)) ||
      (item.wkn && item.wkn.toLowerCase().startsWith(queryNormalized))
    );
  }).slice(0, 5);

  // If query consists of only 2 or fewer characters, immediately return local matches
  // Typists write individual letters slowly, which results in extreme request volume.
  if (queryNormalized.length <= 2) {
    console.log(`[Short Query] Served locally for "${queryNormalized}" to prevent rate limits.`);
    return res.json(localMatches);
  }

  // Check if we are currently cooling down from a 429 Resource exhausted error
  const isInCooldown = Date.now() - lastRateLimitTime < RATE_LIMIT_COOLDOWN_MS;

  // 2. Query Gemini only if AI client is configured, we are NOT in rate-limit cooldown, and local match count isn't already solid
  if (aiClient && !isInCooldown) {
    try {
      const response = await aiClient.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Search for high-quality, real financial stock listings corresponding to the user query "${query.trim()}".
        The query might be a stock name, ticker symbol (like AAPL, MBG), international ISIN number, or German WKN code.
        Return a list of matching stocks.
        
        Requirements:
        - Search for real, accurate identifiers.
        - Calculate/suggest a realistic typical daily ATR (Average True Range) value for each stock based on its current trading price and daily volatility.
        - Ensure you provide name, symbol, typical current price (as numeric string format, e.g. "175.50"), realistic decimal ATR, ISIN, and WKN if known.
        - Limit list to maximum 5 of the most matching, real assets.`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                symbol: { type: Type.STRING, description: "The standard main ticker symbol (e.g., 'AAPL', 'SAP', 'TSLA')." },
                name: { type: Type.STRING, description: "The full official name of the company or asset." },
                price: { type: Type.STRING, description: "The typical or current price of the asset (e.g. '220.00')." },
                atr: { type: Type.STRING, description: "Suggest/calculate a typical daily ATR value for this stock based on its current price and common historical daily range. Realistic decimal string." },
                isin: { type: Type.STRING, description: "The ISIN of the security if known/found." },
                wkn: { type: Type.STRING, description: "The WKN (German security code) if known/found." }
              },
              required: ["symbol", "name", "price", "atr"]
            }
          }
        }
      });

      const responseText = response.text || "[]";
      const aiMatches = JSON.parse(responseText);
      
      if (Array.isArray(aiMatches)) {
        // Merge results keeping local matches as higher priority, filtering out duplicate tickers
        const merged = [...localMatches];
        for (const item of aiMatches) {
          if (!merged.some(m => m.symbol.toUpperCase() === item.symbol.toUpperCase())) {
            merged.push({
              symbol: item.symbol.toUpperCase(),
              name: item.name,
              price: item.price,
              atr: item.atr,
              isin: item.isin,
              wkn: item.wkn
            });
          }
        }
        const finalResults = merged.slice(0, 5);
        // Save to cache of active entries
        if (searchCache.size > 100) {
          // Keep cache clean and under 100 items
          const firstKey = searchCache.keys().next().value;
          if (firstKey) searchCache.delete(firstKey);
        }
        searchCache.set(queryNormalized, finalResults);
        console.log("Returned combined stock suggestions for query:", query, finalResults.length);
        return res.json(finalResults);
      }
    } catch (error: any) {
      if (error?.status === 429 || error?.statusCode === 429 || error?.message?.includes("quota") || error?.message?.includes("429")) {
        // Trigger Cooldown to completely ignore AI lookup requests for the next 30 seconds
        lastRateLimitTime = Date.now();
        console.warn("[Rate Limit Triggered] Activating AI lookup cooldown of 30 seconds. Falling back to local offline dictionary.");
      } else {
        console.warn("Gemini stock search call failed, falling back to offline dictionary:", error.message || error);
      }
    }
  }

  // Populate cache with local offline dictionary output as simple search safety
  if (localMatches.length > 0 && !searchCache.has(queryNormalized)) {
    searchCache.set(queryNormalized, localMatches);
  }

  // Fallback cleanly to local search matches
  console.log("Returned local stock dictionary suggestions for query:", query, localMatches.length);
  res.json(localMatches);
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

if (!process.env.VERCEL) {
  startServer();
}

export default app;
