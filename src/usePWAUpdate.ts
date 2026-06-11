import { useEffect, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';

const UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000;

/**
 * Hook that owns the PWA service-worker lifecycle so multiple UI elements
 * (header update badge + bottom-right update banner) can share the same
 * state and trigger the same actions.
 *
 * - `needRefresh` flips true the moment a new service worker is installed
 *   and waiting.
 * - `applyUpdate()` activates the waiting worker and reloads.
 * - `checkForUpdate()` forces an immediate poll against the deploy server.
 */
export function usePWAUpdate() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const [updateSW, setUpdateSW] = useState<((reload?: boolean) => Promise<void>) | null>(null);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    const update = registerSW({
      onNeedRefresh() {
        setNeedRefresh(true);
      },
      onRegisteredSW(_swUrl, reg) {
        if (!reg) return;
        setRegistration(reg);
        setInterval(() => {
          reg.update().catch(() => {});
        }, UPDATE_CHECK_INTERVAL_MS);
      },
    });
    setUpdateSW(() => update);
  }, []);

  const applyUpdate = () => {
    if (updateSW) updateSW(true);
    else window.location.reload();
  };

  const checkForUpdate = async () => {
    if (!registration) return { status: "no-sw" as const };
    await registration.update();
    if (registration.waiting || registration.installing) {
      return { status: "available" as const };
    }
    return { status: "current" as const };
  };

  return {
    needRefresh,
    applyUpdate,
    checkForUpdate,
    dismiss: () => setNeedRefresh(false),
  };
}
