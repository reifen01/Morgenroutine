/**
 * FEHLER-SICHERHEITSNETZ
 * ----------------------
 * Fängt Render-Fehler ab, damit die App nie wieder als weißer Bildschirm
 * endet. Statt Absturz erscheint eine erklärende Seite mit Auswegen —
 * insbesondere dem Zugang zu den eigenen Daten.
 */
import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message: string;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message || String(error) };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[Morgenroutine] Render-Fehler abgefangen:", error, info);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleClearCaches = async () => {
    // Nur Service-Worker-Caches leeren — NIEMALS localStorage,
    // dort liegen Portfolio, Käufe und Verlauf!
    try {
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
    } catch (e) {
      console.error("Cache-Reset fehlgeschlagen:", e);
    }
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#f1f5f9",
          padding: "24px 16px",
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
          color: "#0f172a",
        }}
      >
        <div
          style={{
            maxWidth: 520,
            margin: "0 auto",
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 24,
            padding: 24,
            boxShadow: "0 4px 14px rgba(15,23,42,.06)",
          }}
        >
          <h1 style={{ fontSize: 18, fontWeight: 800, margin: "0 0 8px" }}>
            ⚠️ Die Ansicht konnte nicht geladen werden
          </h1>
          <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, margin: "0 0 16px" }}>
            Es ist ein Anzeigefehler aufgetreten. <strong>Deine Daten sind sicher</strong> —
            Portfolio, Käufe und Verlauf liegen unverändert auf diesem Gerät und werden
            durch diese Meldung nicht verändert.
          </p>

          <div
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              padding: 12,
              fontSize: 11,
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              color: "#64748b",
              wordBreak: "break-word",
              margin: "0 0 18px",
            }}
          >
            {this.state.message}
          </div>

          <button
            onClick={this.handleReload}
            style={{
              width: "100%",
              background: "#0f172a",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              padding: "12px 16px",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
              marginBottom: 10,
            }}
          >
            🔄 Neu laden
          </button>

          <button
            onClick={this.handleClearCaches}
            style={{
              width: "100%",
              background: "#fff",
              color: "#0f172a",
              border: "1px solid #cbd5e1",
              borderRadius: 12,
              padding: "12px 16px",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            🧹 App-Cache zurücksetzen &amp; neu laden
          </button>

          <p style={{ fontSize: 11, color: "#64748b", lineHeight: 1.6, marginTop: 14, marginBottom: 0 }}>
            Der Cache-Reset entfernt nur zwischengespeicherte Programmdateien —
            <strong> deine Portfolio-Daten bleiben erhalten.</strong> Hilft das nicht,
            öffne die App in Safari unter morgenroutine.vercel.app und sichere dort ein Backup.
          </p>
        </div>
      </div>
    );
  }
}
