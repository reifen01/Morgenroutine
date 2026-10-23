# Verarbeitungsübersicht — was dieses Produkt mit personenbezogenen Daten macht

> Die ehrliche Übersicht, welche personenbezogenen Daten das Produkt verarbeitet, wozu und wie lange.
>
> - Angelegt und aktuell gehalten von `/dsgvo`, ein Eintrag je Verarbeitungszweck.
> - Wächst mit dem Produkt: Ändert ein Feature, was gespeichert wird, ändert sich sein Eintrag.
> - **Flughöhe:** Zwecke, Rechtsgrundlagen, Speicherdauer und wer die Daten sonst sieht. Feldgenaues steht in `docs/data-model.md` und in den Feature-Designs.
>
> Entspricht weitgehend dem Verzeichnis von Verarbeitungstätigkeiten (Art. 30 DSGVO; Art. 12 DSG) — ist aber ein technisches Dokument, keine rechtliche Einreichung. Ob es für deinen Fall vollständig ist, entscheidet ein Anwalt oder Datenschutzberater.

**Anwendbares Recht:** DSGVO (EU/AT) · DSG (CH) · AI Act (EU) — aus `.ai-eng-kit` → `law`; Regeln in `docs/law/`
**Datenschutz-Haltung:** standard — `docs/PRD.md` → Rahmenbedingungen
**Verantwortlicher:** der Autor als Privatperson (Österreich) — Name und Anschrift noch einzutragen
**Zuletzt geprüft:** 2026-10-22 (Feature-Prüfung MR-9; eine Prüfung des ganzen Projekts mit `/dsgvo` steht noch aus)

**Grundsatz der App:** Kein Konto, keine Datenbank. Depot, Journal, Notizen und Auswertungen liegen nur im Browser des Nutzers (`localStorage`). Der Betreiber sieht diese Daten nicht. Personenbezogene Daten verlassen das Gerät nur bei einzelnen Server-Aufrufen — vor allem bei den KI-Funktionen.

---

## Verarbeitungstätigkeiten

| Zweck | Daten | Wessen | Warum rechtmäßig | Speicherdauer | Beteiligte Auftragsverarbeiter |
|-------|-------|--------|------------------|---------------|-------------------------------|
| Routine-Auswertung & Erträgnisaufstellung (MR-9) | Tages-Snapshots (Marktdaten, nicht personenbezogen), Pareto-Notizen (Freitext), Verkäufe mit Ergebnis, KESt, Depot- und Besitzername | Nutzer der App (und ggf. eingetragene Mit-Besitzer) | Bleibt auf dem Gerät des Nutzers; der Betreiber verarbeitet nichts davon | Bis der Nutzer löscht („Alles löschen“, MR-11) | keine |
| KI-Entwurf der Perioden-Analyse (MR-9, heute) | Nur Marktdaten des Zeitraums | — (nicht personenbezogen) | — | Nicht gespeichert (Server) | Vercel, Google Gemini |
| KI-Entwurf mit Wirkung auf Depot & Trades (MR-9 AC-14, **geplant**) | Käufe/Verkäufe des Zeitraums — nur Titel, Datum, Ergebnis in %, Kauf an ROT-Tag; nur bei eingeschaltetem Opt-in (MR-9 AC-17, AC-18) | Nutzer der App | DSGVO: Art. 6(1)(b) für die angeforderte Auswertung; solange der Gemini-**Gratis-Tarif** läuft, nutzt Google die Eingaben auch für eigene Zwecke → dafür **Einwilligung** Art. 6(1)(a) nötig · DSG: erwartbarer Zweck, Hinweis + Bekanntgabe des Exportlands | Server speichert und protokolliert nichts; bei Google laut Gemini-API-Bedingungen (Gratis-Tarif: inkl. Produktverbesserung, menschliche Prüfung möglich) | Vercel, Google Gemini |

## Besondere Kategorien

- keine. Finanzdaten (Trades, Gewinne) sind **keine** besondere Kategorie nach Art. 9 DSGVO / Art. 5 lit. c DSG, aber vertraulich — Freitextfelder (`notiz`, `gedanken`, `ziele`) können trotzdem alles enthalten und gehen deshalb nicht an die KI.

## Auftragsverarbeiter (Auftragsbearbeiter)

| Dienst | Was er verarbeitet | Region | AVV / DPA | Außerhalb der angemessenen Länder? |
|--------|--------------------|--------|-----------|-----------------------------------|
| Vercel | Server-Anfragen inkl. IP, Request-Inhalt der KI-Aufrufe (durchgereicht), Logs | **nicht ermittelt** (Function-Region im Dashboard prüfen) | ☐ (Vercel DPA, im Dashboard) | US-Unternehmen; EU-US / Swiss-US DPF prüfen |
| Google Gemini API | Prompt-Inhalt der KI-Funktionen | **nicht ermittelt** | ☐ — beim Gratis-Tarif gelten Googles Bedingungen für unbezahlte Dienste, nicht die Datenverarbeitungsbedingungen für bezahlte | US-Unternehmen; DPF prüfen |

## Betroffenenrechte — wie sie erfüllt werden

| Recht | DSGVO | DSG | Wie die App es erfüllt |
|-------|-------|-----|------------------------|
| Auskunft / Kopie | Art. 15 | Art. 25 | Daten liegen beim Nutzer; Export über die verschlüsselte Backup-Datei (MR-11). Beim Betreiber liegt nichts. |
| Berichtigung | Art. 16 | Art. 32 | Nutzer bearbeitet selbst in der App. |
| Löschung | Art. 17 | Art. 32 / Art. 6 Abs. 4 | „Alles löschen“ (MR-11); einzelne Pareto-Notiz löschen (vorgeschlagen). Was bei Google liegt: nur über Google. |
| Datenübertragbarkeit | Art. 20 | Art. 28 | Backup-Datei (MR-11). |
| Widerspruch / Widerruf | Art. 21 / Art. 7(3) | Art. 30 Abs. 2 | Schalter „Trades in KI-Auswertung einbeziehen“ (vorgeschlagen), jederzeit ausschaltbar. |

> Frist: **ein Monat** nach DSGVO (Art. 12(3)), **30 Tage** nach DSG (Art. 25 Abs. 7).

## Offene Punkte

- [ ] Gemini auf **bezahlten Tarif** umstellen (dann keine Nutzung der Eingaben durch Google für eigene Zwecke) — oder Einwilligung vor dem Senden einholen (MR-9)
- [ ] Vercel-Function-Region ermitteln, wenn möglich auf Frankfurt (`fra1`) stellen
- [ ] AVV/DPA mit Vercel und Google (Gemini, bezahlter Tarif) abschließen
- [ ] Datenschutzerklärung in der App (nennt Vercel, Google Gemini, USA als Exportland) — fehlt projektweit; für MR-9 als AC-20 in der Spec
- [ ] Hinweis „Keine Anlageberatung — nur zu Informations- und Lernzwecken“ beim ersten Start / bei der Installation (in der Spec als MR-12 AC-12, noch nicht gebaut)
- [ ] Name und Anschrift des Verantwortlichen eintragen
- [ ] `/dsgvo` für das ganze Projekt ausführen (KI-Coach, Screenshot-OCR, Google-Workspace-Sync, Cloud-Profile mit PIN sind hier noch nicht bewertet)

## Für einen Anwalt / Datenschutzberater

- Ich betreibe die App als **Privatperson** öffentlich und kostenlos für fremde Nutzer, ohne Konten; alle Daten liegen im Browser der Nutzer. Bin ich für die KI-Aufrufe (Trades gehen über meine Vercel-Function an Google Gemini) Verantwortlicher, und reicht ein Hinweis plus Opt-in-Schalter vor dem ersten Senden?
  _Einschätzung des Betreibers (2026-10-22):_ für die eigenen Daten ja; fremde Depots sieht er nie, die App startet leer. _Technischer Hinweis:_ Verantwortlich macht nach Art. 4 Nr. 7 DSGVO, wer Zweck und Mittel festlegt, nicht wer die Daten sieht — umgesetzt sind daher Opt-in und Datensparsamkeit (MR-9 AC-17, AC-18).
- Gemini läuft im **Gratis-Tarif**, bei dem Google Eingaben für eigene Zwecke nutzen darf. Ist das für pseudonyme Trade-Daten fremder Nutzer mit Einwilligung vertretbar, oder muss ich auf den bezahlten Tarif wechseln? Gilt für Aufrufe aus der EU eine abweichende Regel in Googles Bedingungen?
  _Einschätzung des Betreibers:_ mit Einwilligung vertretbar. _Technischer Hinweis:_ Google sieht die Daten trotzdem; der bezahlte Tarif bleibt die sicherere Wahl.
- Die KI-Auswertung bewertet Trades gegen ein Regelwerk („durfte gekauft werden?“). Ist das in Österreich bereits **Anlageberatung** (WAG/BWG)?
  _Einschätzung des Betreibers:_ nein. _Umgesetzt:_ Hinweis „Keine Anlageberatung — nur zu Informations- und Lernzwecken“ unter jedem KI-Entwurf (MR-9 AC-23) und beim ersten Start der App (geplant für MR-12); keine Einzeltitel-Empfehlungen.
