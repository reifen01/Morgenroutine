/**
 * MARKTAMPEL — zentrale Kaufsperre-Logik
 * --------------------------------------
 * Eine einzige Quelle für die Frage "darf laut Makro-Umfeld gekauft werden?".
 * Wird sowohl im Morgenroutine-Tab (Statusbanner) als auch im Depot
 * (Signal-Spalte der Bestandstabelle) verwendet, damit beide nie
 * auseinanderlaufen.
 */
import { MarketState } from "../types";

export interface MarketHealth {
  healthy: boolean;      // true = Käufe grundsätzlich erlaubt
  blocked: boolean;      // Gegenteil, zur Bequemlichkeit
  reason: string;        // Klartext, warum gesperrt (leer wenn gesund)
}

export function evaluateMarketHealth(m: MarketState): MarketHealth {
  const vix = m.vix;
  const vxv = m.vxv;
  const vvix = m.vvix;
  const wti = m.wti;
  const gas = m.gas;

  const livesFilled =
    vix !== null && vix !== undefined &&
    vxv !== null && vxv !== undefined &&
    vvix !== null && vvix !== undefined &&
    wti !== null && wti !== undefined &&
    gas !== null && gas !== undefined;

  // Contango = VIX < VXV (Terminstruktur normal). Backwardation sperrt.
  const isContango = vix !== null && vxv !== null && vix < vxv;

  let reason = "";
  if (!livesFilled) {
    reason = "Keine vollständigen Marktdaten";
  } else if (vvix !== null && vvix >= 130) {
    reason = "VVIX ≥ 130";
  } else if (wti !== null && wti >= 100) {
    reason = "WTI Öl ≥ 100 $";
  } else if (gas !== null && gas >= 4.5) {
    reason = "Erdgas ≥ 4,50 $";
  } else if (vix !== null && vix >= 25) {
    reason = "Panik: VIX ≥ 25";
  } else if (!isContango) {
    reason = "Backwardation (VIX/VXV ≥ 1)";
  }

  const healthy = livesFilled && reason === "";
  return { healthy, blocked: !healthy, reason };
}
