// Vergleich Haiku 5.5 gegen Sonnet 5.5 als KI-Coach der Morgenroutine.
//
// Nimmt den echten Coach-System-Prompt aus server.ts (Konstante
// `systemInstruction`), stellt beiden Modellen dieselben Fragen aus
// fragen.json und schreibt Antworten, Tokens und Kosten nach ergebnis.md.
//
// Aufruf (im Ordner scripts/ki-vergleich):
//   npm install
//   npm run vergleich                    nur Haiku (Standard)
//   npm run vergleich -- haiku sonnet    beide nebeneinander
//
// Braucht MR_CLAUDE_API_KEY als Umgebungsvariable (Cloud-Umgebung -> Edit ->
// Umgebungsvariablen). Der Schluessel wird nie ausgegeben oder gespeichert.
// Kosten: ein Haiku-Lauf deutlich unter 1 Cent.

import Anthropic from "@anthropic-ai/sdk";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const serverTs = fs.readFileSync(path.join(here, "..", "..", "server.ts"), "utf8");
const match = serverTs.match(/const systemInstruction = `([\s\S]*?)`;/);
if (!match) {
  console.error("Coach-Prompt in server.ts nicht gefunden (const systemInstruction = `...`).");
  process.exit(1);
}
const SYSTEM = match[1].trim();
const FRAGEN = JSON.parse(fs.readFileSync(path.join(here, "fragen.json"), "utf8"));

// Preise je 1 Mio. Tokens (Eingabe / Ausgabe), Stand Skill-Tabelle 2026-10-06.
const ALLE_MODELLE = [
  { kurz: "haiku", id: "claude-haiku-5-5", name: "Haiku 5.5", ein: 0.10, aus: 0.50 },
  { kurz: "sonnet", id: "claude-sonnet-5-5", name: "Sonnet 5.5", ein: 2.00, aus: 10.00 },
];

// Standard: nur Haiku. Weitere Modelle per Argument, z. B.
//   npm run vergleich -- sonnet          nur Sonnet
//   npm run vergleich -- haiku sonnet    beide nebeneinander
const gewuenscht = process.argv.slice(2).map((a) => a.toLowerCase());
const MODELLE = ALLE_MODELLE.filter((m) => (gewuenscht.length ? gewuenscht.includes(m.kurz) : m.kurz === "haiku"));
if (MODELLE.length === 0) {
  console.error(`Unbekanntes Modell. Erlaubt: ${ALLE_MODELLE.map((m) => m.kurz).join(", ")}`);
  process.exit(1);
}

// Eigener Variablenname, weil die Claude-Code-Cloud-Umgebung ANTHROPIC_API_KEY
// nicht an Sitzungen weiterreicht (reserviert fuer Claude Code selbst) und
// ANTHROPIC_BASE_URL auf ihren eigenen Proxy setzt. Deshalb Schluessel und
// Adresse hier ausdruecklich.
const apiKey = process.env.MR_CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
if (!apiKey || !apiKey.startsWith("sk-ant-")) {
  console.error(
    apiKey
      ? "Schluessel hat das falsche Format (muss mit sk-ant- beginnen)."
      : "Kein Schluessel: MR_CLAUDE_API_KEY in der Umgebung eintragen.",
  );
  process.exit(1);
}
// Ein echter Schluessel besteht nur aus Buchstaben, Ziffern, - und _.
// Haeufigster Fehler: ein mitkopierter Platzhalter wie "…" oder ein Leerzeichen.
const fremd = [...apiKey].findIndex((c) => !/[A-Za-z0-9_-]/.test(c));
if (fremd !== -1) {
  console.error(
    `Schluessel enthaelt an Stelle ${fremd + 1} ein unerlaubtes Zeichen ` +
      `(z. B. "…", Leerzeichen oder Anfuehrungszeichen). Zeile in der Umgebung neu eintragen.`,
  );
  process.exit(1);
}
const client = new Anthropic({ apiKey, baseURL: "https://api.anthropic.com" });

async function frage(modell, text) {
  const start = Date.now();
  const params = {
    model: modell.id,
    max_tokens: 16000,
    system: SYSTEM,
    output_config: { effort: "medium" },
    messages: [{ role: "user", content: text }],
  };
  // Sonnet 5.5: serverseitiger Fallback bei Ablehnung (Haiku hat keinen).
  const response =
    modell.id === "claude-sonnet-5-5"
      ? await client.beta.messages.create({
          ...params,
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
        })
      : await client.messages.create(params);

  const sekunden = ((Date.now() - start) / 1000).toFixed(1);
  if (response.stop_reason === "refusal") {
    return { antwort: `(abgelehnt: ${response.stop_details?.category ?? "ohne Kategorie"})`, sekunden, usage: response.usage };
  }
  const antwort = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n")
    .trim();
  return { antwort, sekunden, usage: response.usage };
}

function kosten(modell, usage) {
  return (usage.input_tokens * modell.ein + usage.output_tokens * modell.aus) / 1_000_000;
}

let md = `# KI-Coach: ${MODELLE.map((m) => m.name).join(" gegen ")}\n\n_Lauf vom ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC · Coach-Prompt aus server.ts · effort medium_\n\n`;
const summe = Object.fromEntries(MODELLE.map((m) => [m.id, 0]));

for (const [i, text] of FRAGEN.entries()) {
  md += `## Frage ${i + 1}\n\n> ${text}\n\n`;
  for (const modell of MODELLE) {
    process.stdout.write(`Frage ${i + 1} · ${modell.name} ... `);
    try {
      const r = await frage(modell, text);
      const k = kosten(modell, r.usage);
      summe[modell.id] += k;
      md += `### ${modell.name} · ${r.sekunden} s · ${r.usage.input_tokens} ein / ${r.usage.output_tokens} aus · ${(k * 100).toFixed(3)} Cent\n\n${r.antwort}\n\n`;
      console.log(`ok (${r.sekunden} s)`);
    } catch (err) {
      const name = err instanceof Anthropic.APIError ? `API-Fehler ${err.status}` : "Fehler";
      md += `### ${modell.name}\n\n(${name}: ${err.message})\n\n`;
      console.log(name);
    }
  }
}

md += `## Summe\n\n| Modell | Kosten dieses Laufs |\n|---|---|\n`;
for (const m of MODELLE) md += `| ${m.name} | ${(summe[m.id] * 100).toFixed(2)} Cent |\n`;

fs.writeFileSync(path.join(here, "ergebnis.md"), md);
console.log(`\nFertig: ${path.join(here, "ergebnis.md")}`);
