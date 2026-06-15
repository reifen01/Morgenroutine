import { useState, useEffect, ChangeEvent } from "react";
import { 
  FolderSync, 
  FileSpreadsheet, 
  FileText, 
  Database, 
  Key, 
  LogOut, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCcw, 
  Download, 
  Upload, 
  Layers,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  FileCode,
  Copy,
  Smartphone,
  QrCode
} from "lucide-react";
import { MarketState, LivePrices, PortfolioItem, ChecklistItem, SoldTradeItem, PortfolioPurchase } from "../types";
import { formatAccounting } from "../utils/mathUtils";

const validateAndCleanFolderId = (val: string): { isValid: boolean; warningMsg?: string } => {
  if (!val) return { isValid: true };

  const trimmed = val.trim();
  
  // 1. Is it a Windows/local file path? (contains backslash \, drive colon :, or starts with H:\, C:\)
  if (trimmed.includes("\\") || /^[A-Za-z]:/.test(trimmed)) {
    return {
      isValid: false,
      warningMsg: "⚠️ Lokaler PC-Pfad erkannt (z. B. 'H:\\...'). Web-Apps haben aus Sicherheitsgründen keinen Zugriff auf deinen lokalen Computer. Bitte trage die Google Drive Cloud-ID oder den Browser-Link ein."
    };
  }

  // 2. Is it a simple folder name instead of an ID? (contains spaces or starts with !)
  if (trimmed.includes(" ") || trimmed.startsWith("!")) {
    return {
      isValid: false,
      warningMsg: "⚠️ Du hast vermutlich einen Ordnernamen (mit Leerzeichen oder Sonderzeichen) eingetragen. Web-Apps im Browser benötigen die genaue, kryptische Google Drive Ordner-ID (z. B. '1c_X1D...') oder den kompletten Browser-Link (URL)."
    };
  }

  // If it contains slashes but doesn't start with http/https
  if (trimmed.includes("/") && !trimmed.startsWith("http")) {
    return {
      isValid: false,
      warningMsg: "⚠️ Ungültiges Format. Bitte verwende entweder den direkten Browser-Link (beginnend mit https://) oder die reine Google Drive Ordner-ID."
    };
  }

  return { isValid: true };
};

interface WorkspaceSyncTabProps {
  marketState: MarketState;
  onMarketStateChange: (state: MarketState) => void;
  livePrices: LivePrices;
  onLivePricesChange: (prices: LivePrices) => void;
  portfolioData: PortfolioItem[];
  onPortfolioDataChange: (data: PortfolioItem[]) => void;
  checklistData: ChecklistItem[];
  onChecklistDataChange: (data: ChecklistItem[]) => void;
  soldTrades: SoldTradeItem[];
  onSoldTradesChange: (data: SoldTradeItem[]) => void;
  portfolioPurchases: PortfolioPurchase[];
  onPortfolioPurchasesChange: (data: PortfolioPurchase[]) => void;
  customDepots: string[];
  onCustomDepotsChange: (depots: string[]) => void;
  customBesitzer: string[];
  onCustomBesitzerChange: (besitzer: string[]) => void;
  depotStartingCash: Record<string, number>;
  onDepotStartingCashChange: (cash: Record<string, number>) => void;
  routineDate: string;
  csvExportString: string;
  onShowToast: (title: string, msg: string, type: "success" | "warning" | "error") => void;
  onOpenBackupSetup?: () => void;
  onOpenBackupRestore?: () => void;
  onLoadDemoData?: () => void;
}

interface BackupFile {
  id: string;
  name: string;
  createdTime: string;
}

export default function WorkspaceSyncTab({
  marketState,
  onMarketStateChange,
  livePrices,
  onLivePricesChange,
  portfolioData,
  onPortfolioDataChange,
  checklistData,
  onChecklistDataChange,
  soldTrades,
  onSoldTradesChange,
  portfolioPurchases,
  onPortfolioPurchasesChange,
  customDepots,
  onCustomDepotsChange,
  customBesitzer,
  onCustomBesitzerChange,
  depotStartingCash,
  onDepotStartingCashChange,
  routineDate,
  csvExportString,
  onShowToast,
  onOpenBackupSetup,
  onOpenBackupRestore,
  onLoadDemoData,
}: WorkspaceSyncTabProps) {
  // OAuth credentials & connection states
  const [clientId, setClientId] = useState<string>(() => {
    return localStorage.getItem("g_workspace_client_id") || "888436370853-example.apps.googleusercontent.com";
  });
  const [accessToken, setAccessToken] = useState<string | null>(() => {
    return localStorage.getItem("g_workspace_access_token") || null;
  });
  const [userInfo, setUserInfo] = useState<{ name: string; email: string; picture?: string } | null>(null);

  // Sheet configuration & target IDs
  const [targetSpreadsheetId, setTargetSpreadsheetId] = useState<string>(() => {
    return localStorage.getItem("g_workspace_spreadsheet_id") || "";
  });
  const [targetDocumentId, setTargetDocumentId] = useState<string>(() => {
    return localStorage.getItem("g_workspace_document_id") || "";
  });
  const [targetFolderId, setTargetFolderId] = useState<string>(() => {
    return localStorage.getItem("g_workspace_backup_folder_id") || "";
  });
  const [sheetExportMode, setSheetExportMode] = useState<"new_file" | "append">(() => {
    return (localStorage.getItem("g_workspace_sheet_export_mode") as "new_file" | "append") || "new_file";
  });
  const [docsApiError, setDocsApiError] = useState<string | null>(null);
  const [docsApiErrorUrl, setDocsApiErrorUrl] = useState<string | null>(null);
  const [sheetsApiError, setSheetsApiError] = useState<string | null>(null);
  const [sheetsApiErrorUrl, setSheetsApiErrorUrl] = useState<string | null>(null);
  const [activeHelpSection, setActiveHelpSection] = useState<"sheets" | "docs" | "offline" | "drive" | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Local & Cloud Profile manager states
  const [profileName, setProfileName] = useState<string>("");
  const [profilePin, setProfilePin] = useState<string>("");
  const [localProfiles, setLocalProfiles] = useState<Record<string, { clientId: string; spreadsheetId: string; documentId: string; folderId: string }>>(() => {
    try {
      return JSON.parse(localStorage.getItem("g_workspace_local_profiles") || "{}");
    } catch (_) {
      return {};
    }
  });
  const [selectedLocalProfileName, setSelectedLocalProfileName] = useState<string>("");
  const [isCloudSyncLoading, setIsCloudSyncLoading] = useState<boolean>(false);

  // UI state managers
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [backupFiles, setBackupFiles] = useState<BackupFile[]>([]);
  const [customAccessToken, setCustomAccessToken] = useState<string>("");
  const [isShowingCustomKey, setIsShowingCustomKey] = useState<boolean>(false);
  const [folderIdWarning, setFolderIdWarning] = useState<string | null>(null);

  // Validate Google Drive folder destination format
  useEffect(() => {
    if (targetFolderId) {
      const result = validateAndCleanFolderId(targetFolderId);
      if (!result.isValid) {
        setFolderIdWarning(result.warningMsg || null);
      } else {
        setFolderIdWarning(null);
      }
    } else {
      setFolderIdWarning(null);
    }
  }, [targetFolderId]);

  // Storage listener to synchronize login status in real-time between iframe and standalone tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "g_workspace_access_token") {
        setAccessToken(e.newValue);
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  // Parsed hash for Google Implicit OAuth redirect handling or postMessage
  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      const params = new URLSearchParams(hash.substring(1));
      const token = params.get("access_token");
      if (token) {
        localStorage.setItem("g_workspace_access_token", token);
        setAccessToken(token);
        // Clear hash from URL to keep address bar clean
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
        onShowToast("Google Workspace", "🟢 Willkommen! Erfolgreich über Google OAuth 2.0 angemeldet.", "success");
      }
    }
  }, [onShowToast]);

  // Popup Event Listener: Recieve the access token securely from the OAuth Callback popup
  useEffect(() => {
    const handlePopupMessage = (event: MessageEvent) => {
      const origin = event.origin;
      // Allow only current origin or local testing
      if (!origin.endsWith('.run.app') && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
        return;
      }

      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const hash = event.data.hash;
        if (hash) {
          const params = new URLSearchParams(hash.substring(1));
          const token = params.get("access_token");
          if (token) {
            localStorage.setItem("g_workspace_access_token", token);
            setAccessToken(token);
            onShowToast("Google Workspace", "🟢 Willkommen! Erfolgreich über Google OAuth 2.0 angemeldet.", "success");
          }
        }
      }
    };

    window.addEventListener("message", handlePopupMessage);
    return () => {
      window.removeEventListener("message", handlePopupMessage);
    };
  }, [onShowToast]);

  // Fetch logged in user profile with current token
  useEffect(() => {
    if (accessToken) {
      fetchUserInfo();
      fetchDriveBackups();
    } else {
      setUserInfo(null);
      setBackupFiles([]);
    }
  }, [accessToken]);

  const fetchUserInfo = async () => {
    if (!accessToken) return;
    try {
      const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        setUserInfo({
          name: data.name || "Workspace-User",
          email: data.email || "",
          picture: data.picture,
        });
      } else {
        // Token might have expired
        handleSignOut();
        onShowToast("Sitzung abgelaufen", "Dein Google-Access-Token ist abgelaufen. Bitte melde dich erneut an.", "warning");
      }
    } catch (err) {
      console.error("Error fetching user info:", err);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem("g_workspace_access_token");
    setAccessToken(null);
    setUserInfo(null);
    setBackupFiles([]);
    onShowToast("Abgemeldet", "Verbindung zum Google Workspace getrennt.", "warning");
  };

  const handleSaveClientId = (id: string) => {
    setClientId(id);
    localStorage.setItem("g_workspace_client_id", id);
  };

  // Google OAuth 2.0 Implicit Flow Trigger via Secure Popup to dodge iframe restrictions
  const handleOAuthLogin = () => {
    if (!clientId || clientId.includes("example.apps")) {
      onShowToast("Einstellung erforderlich", "Bitte trage eine gültige Google Client-ID aus deiner GCP Console ein.", "error");
      return;
    }

    const redirectUri = encodeURIComponent(window.location.origin + "/auth/callback");
    const scopes = encodeURIComponent([
      "https://www.googleapis.com/auth/drive",
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/documents",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile"
    ].join(" "));

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=token&scope=${scopes}&prompt=select_account`;
    
    // Open Google Login in a beautiful popup center screen
    const width = 600;
    const height = 650;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const popup = window.open(
      authUrl,
      "google_oauth_popup",
      `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes`
    );

    if (popup) {
      onShowToast("Google Anmeldung", "Bitte schließe die Google-Autorisierung im geöffneten Popup-Fenster ab.", "success");
    } else {
      onShowToast("Popup blockiert", "⚠️ Bitte erlaube Popups für diese Seite in deinem Browser, um dich anzumelden.", "error");
    }
  };

  const handleApplyCustomToken = () => {
    if (!customAccessToken.trim()) {
      onShowToast("Token ungültig", "Bitte füge einen gültigen Access-Token ein.", "error");
      return;
    }
    localStorage.setItem("g_workspace_access_token", customAccessToken.trim());
    setAccessToken(customAccessToken.trim());
    setCustomAccessToken("");
    setIsShowingCustomKey(false);
    onShowToast("Manuelle Verbindung", "Access-Token erfolgreich übernommen!", "success");
  };

  // ==========================================
  // PROFILE LOCKBOX CONFIGURATION HANDLERS
  // ==========================================

  // Save the currently entered Google Client-ID & target Document IDs to a named profile in localStorage
  const handleSaveLocalProfile = (nameToSave?: string) => {
    let name = nameToSave ? nameToSave.trim() : "";
    if (!name) {
      const input = prompt("Bitte gib einen Namen für dieses Verbindungsprofil ein (z.B. 'DADA-Live', 'Mitarbeiter Setup'):");
      if (input === null) return; // User cancelled
      name = input.trim();
    }
    if (!name) {
      onShowToast("Eingabe ungültig", "Profilname darf nicht leer sein.", "warning");
      return;
    }
    
    const updated = {
      ...localProfiles,
      [name]: {
        clientId: clientId.trim(),
        spreadsheetId: targetSpreadsheetId.trim(),
        documentId: targetDocumentId.trim(),
        folderId: targetFolderId.trim()
      }
    };
    setLocalProfiles(updated);
    localStorage.setItem("g_workspace_local_profiles", JSON.stringify(updated));
    setSelectedLocalProfileName(name);
    onShowToast("Profil gespeichert", `🟢 Profil "${name}" wurde lokal im Browser gesichert!`, "success");
  };

  // Load configuration from local profile
  const handleLoadLocalProfile = (name: string) => {
    if (!name || !localProfiles[name]) return;
    const prof = localProfiles[name];
    
    setClientId(prof.clientId);
    localStorage.setItem("g_workspace_client_id", prof.clientId);
    
    setTargetSpreadsheetId(prof.spreadsheetId);
    if (prof.spreadsheetId) {
      localStorage.setItem("g_workspace_spreadsheet_id", prof.spreadsheetId);
    } else {
      localStorage.removeItem("g_workspace_spreadsheet_id");
    }

    setTargetDocumentId(prof.documentId);
    if (prof.documentId) {
      localStorage.setItem("g_workspace_document_id", prof.documentId);
    } else {
      localStorage.removeItem("g_workspace_document_id");
    }

    setTargetFolderId(prof.folderId);
    if (prof.folderId) {
      localStorage.setItem("g_workspace_backup_folder_id", prof.folderId);
    } else {
      localStorage.removeItem("g_workspace_backup_folder_id");
    }

    setSelectedLocalProfileName(name);
    onShowToast("Profil geladen", `🟢 Profil "${name}" wurde erfolgreich geladen!`, "success");
  };

  // Delete local profile
  const handleDeleteLocalProfile = (name: string) => {
    if (!name) return;
    if (!confirm(`Möchtest du das lokale Profil "${name}" wirklich löschen?`)) return;
    
    const updated = { ...localProfiles };
    delete updated[name];
    setLocalProfiles(updated);
    localStorage.setItem("g_workspace_local_profiles", JSON.stringify(updated));
    if (selectedLocalProfileName === name) {
      setSelectedLocalProfileName("");
    }
    onShowToast("Profil gelöscht", `🔴 Lokales Profil "${name}" wurde dauerhaft entfernt.`, "warning");
  };

  // Download profile backup file to local machine
  const handleExportProfileFile = () => {
    const payload = {
      profileType: "LUMINA_WORKSPACE_PROFILE",
      clientId: clientId.trim(),
      spreadsheetId: targetSpreadsheetId.trim(),
      documentId: targetDocumentId.trim(),
      folderId: targetFolderId.trim()
    };
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(payload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `lumina_zugangsdaten_profil.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    onShowToast("Export erfolgreich", "🟢 Deine Zugangsdaten-IDs wurden als 'lumina_zugangsdaten_profil.json' gesichert.", "success");
  };

  // Upload profile backup file to instantly pop credentials
  const handleImportProfileFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const fileReader = new FileReader();
    fileReader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (parsed.profileType === "LUMINA_WORKSPACE_PROFILE" || parsed.clientId !== undefined) {
          const cId = parsed.clientId || "";
          setClientId(cId);
          localStorage.setItem("g_workspace_client_id", cId);
          
          const sId = parsed.spreadsheetId || "";
          setTargetSpreadsheetId(sId);
          if (sId) localStorage.setItem("g_workspace_spreadsheet_id", sId);
          else localStorage.removeItem("g_workspace_spreadsheet_id");

          const dId = parsed.documentId || "";
          setTargetDocumentId(dId);
          if (dId) localStorage.setItem("g_workspace_document_id", dId);
          else localStorage.removeItem("g_workspace_document_id");

          const fId = parsed.folderId || "";
          setTargetFolderId(fId);
          if (fId) localStorage.setItem("g_workspace_backup_folder_id", fId);
          else localStorage.removeItem("g_workspace_backup_folder_id");

          onShowToast("Profil importiert", "🟢 Zugangsdaten wurden erfolgreich aus der Datei geladen!", "success");
        } else {
          onShowToast("Datei ungültig", "Das ausgewählte JSON-Format ist kein gültiges Lumina-Zugangsprofil.", "error");
        }
      } catch (err) {
        onShowToast("Import Fehler", "Konnte die Profildatei nicht parsen. Bitte eine gültige JSON auswählen.", "error");
      }
    };
    fileReader.readAsText(file);
    event.target.value = "";
  };

  // Securely backup credentials configuration to the Cloud via REST api
  const handleCloudSaveProfile = async () => {
    if (!profileName.trim()) {
      onShowToast("Profilname fehlt", "Bitte gib einen Verbindungsnamen für das Cloud-Lager an.", "warning");
      return;
    }
    if (!profilePin.trim() || profilePin.trim().length < 4) {
      onShowToast("PIN unvollständig", "Bitte gib eine mindestens 4-stellige Sicherheits-PIN für das Cloud-Lager an.", "warning");
      return;
    }

    setIsCloudSyncLoading(true);
    try {
      const response = await fetch("/api/profiles/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profileName.trim(),
          pin: profilePin.trim(),
          payload: {
            clientId: clientId.trim(),
            spreadsheetId: targetSpreadsheetId.trim(),
            documentId: targetDocumentId.trim(),
            folderId: targetFolderId.trim()
          }
        })
      });

      const resData = await response.json();
      if (response.ok) {
        // Also save this name/pin as suggestion in local state
        onShowToast("Sicherung erfolgreich", `🟢 Zugangsdaten in der Cloud unter "${profileName.trim()}" hinterlegt!`, "success");
      } else {
        onShowToast("Sicherungsfehler", `⚠️ ${resData.error || "Speichern fehlgeschlagen."}`, "error");
      }
    } catch (err) {
      onShowToast("Netzwerkfehler", "Verbindung zum Cloud-Profile-Locker fehlgeschlagen.", "error");
    } finally {
      setIsCloudSyncLoading(false);
    }
  };

  // Securely retrieve credentials configuration from the Cloud via REST api
  const handleCloudLoadProfile = async () => {
    if (!profileName.trim()) {
      onShowToast("Profilname fehlt", "Gewünschten Verbindungsnamen eingeben.", "warning");
      return;
    }
    if (!profilePin.trim()) {
      onShowToast("PIN fehlt", "PIN eingeben, um Verbindung aufzubauen.", "warning");
      return;
    }

    setIsCloudSyncLoading(true);
    try {
      const response = await fetch("/api/profiles/load", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: profileName.trim(),
          pin: profilePin.trim()
        })
      });

      const resData = await response.json();
      if (response.ok && resData.payload) {
        const prof = resData.payload;
        setClientId(prof.clientId || "");
        localStorage.setItem("g_workspace_client_id", prof.clientId || "");
        
        setTargetSpreadsheetId(prof.spreadsheetId || "");
        if (prof.spreadsheetId) localStorage.setItem("g_workspace_spreadsheet_id", prof.spreadsheetId);
        else localStorage.removeItem("g_workspace_spreadsheet_id");

        setTargetDocumentId(prof.documentId || "");
        if (prof.documentId) localStorage.setItem("g_workspace_document_id", prof.documentId);
        else localStorage.removeItem("g_workspace_document_id");

        setTargetFolderId(prof.folderId || "");
        if (prof.folderId) localStorage.setItem("g_workspace_backup_folder_id", prof.folderId);
        else localStorage.removeItem("g_workspace_backup_folder_id");

        onShowToast("Cloud-Profil geladen", `🟢 Alle IDs für "${profileName.trim()}" unbestechlich eingespielt!`, "success");
      } else {
        onShowToast("Falsche Zugangsdatei", `❌ ${resData.error || "Verbindung abgelehnt."}`, "error");
      }
    } catch (err) {
      onShowToast("Netzwerkfehler", "Verbindung zum Cloud-Profile-Locker fehlgeschlagen.", "error");
    } finally {
      setIsCloudSyncLoading(false);
    }
  };

  // ==========================================
  // GOOGLE DRIVE BACKUP & RESTORE ACTIONS
  // ==========================================
  const fetchDriveBackups = async (currentFolderId = targetFolderId) => {
    if (!accessToken) return;
    
    if (currentFolderId) {
      const validation = validateAndCleanFolderId(currentFolderId);
      if (!validation.isValid) {
        setBackupFiles([]);
        onShowToast(
          "Ordnerzugriff blockiert",
          validation.warningMsg || "Ungültiges Google Drive Ordnerformat.",
          "warning"
        );
        return;
      }
    }

    try {
      const parentFilter = currentFolderId ? `'${currentFolderId}' in parents and ` : "";
      const queryStr = `${parentFilter}(name contains 'morgenroutine_backup_' or name contains 'Morgenroutine_') and mimeType = 'application/json' and trashed = false`;
      const q = encodeURIComponent(queryStr);
      const fields = encodeURIComponent("files(id,name,createdTime)");
      const orderBy = encodeURIComponent("createdTime desc");
      
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&orderBy=${orderBy}`,
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      if (response.ok) {
        const data = await response.json();
        setBackupFiles(data.files || []);
      } else {
        const errText = await response.text();
        console.error("Error fetching backups from Drive API:", response.status, errText);
        
        if (response.status === 403 || errText.includes("disabled") || errText.includes("Google Drive API")) {
          onShowToast(
            "Drive API deaktiviert", 
            "⚠️ Google Drive API ist in deinem Google Cloud Projekt deaktiviert! Bitte aktiviere die 'Google Drive API' in deiner GCP Console.", 
            "error"
          );
        }
      }
    } catch (err) {
      console.error("Error fetching backups:", err);
    }
  };

  const handleSyncOrCreateFolder = async () => {
    if (!accessToken) {
      onShowToast("Anmeldung erforderlich", "Bitte melde dich zuerst bei Google an.", "error");
      return;
    }
    setIsLoading(true);
    try {
      const q = encodeURIComponent("name = 'Morgenroutine Backups' and mimeType = 'application/vnd.google-apps.folder' and trashed = false");
      const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (searchData.files && searchData.files.length > 0) {
          const foundFolderId = searchData.files[0].id;
          setTargetFolderId(foundFolderId);
          localStorage.setItem("g_workspace_backup_folder_id", foundFolderId);
          onShowToast("Ordner verknüpft", `🟢 Bestehender Order 'Morgenroutine Backups' (${foundFolderId}) erfolgreich verknüpft!`, "success");
          setIsLoading(false);
          setTimeout(() => fetchDriveBackups(foundFolderId), 150);
          return;
        }
      }

      // Create new folder
      const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: "Morgenroutine Backups",
          mimeType: "application/vnd.google-apps.folder",
        }),
      });

      if (createRes.ok) {
        const createdFolder = await createRes.json();
        const newFolderId = createdFolder.id;
        setTargetFolderId(newFolderId);
        localStorage.setItem("g_workspace_backup_folder_id", newFolderId);
        onShowToast("Ordner angelegt", `🟢 Ein neuer, unbestechlicher Speicherordner 'Morgenroutine Backups' wurde in deinem Drive erstellt und verknüpft!`, "success");
        setTimeout(() => fetchDriveBackups(newFolderId), 150);
      } else {
        const errMsg = await createRes.text();
        throw new Error(errMsg);
      }
    } catch (err: any) {
      console.error("Folder sync failed:", err);
      onShowToast("Ordner-Fehler", `Konnte Backup-Ordner nicht erstellen: ${err.message || "Netzwerkfehler"}`, "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    if (!accessToken) {
      onShowToast("Fehlende Berechtigung", "Bitte verbinde dich zuerst mit Google Workspace.", "error");
      return;
    }

    if (targetFolderId) {
      const validation = validateAndCleanFolderId(targetFolderId);
      if (!validation.isValid) {
        onShowToast("System-Sicherung abgebrochen", validation.warningMsg || "Ungültiges Speicherordner-Format.", "error");
        return;
      }
    }

    setIsLoading(true);
    try {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");

      const backupFilename = `Morgenroutine_${routineDate.replace(/-/g, "")}_${hh}${mm}_MEZ.json`;
      const appState = {
        meta: {
          appVersion: "V8",
          compiledAt: "2026-06-03", // Aktuelles Datum
          authorEmail: "fenzl@fenzlakustik.at",
          date: routineDate,
          createdTime: now.toISOString()
        },
        marketState,
        livePrices,
        portfolioData,
        checklistData,
        soldTrades,
        portfolioPurchases,
        customDepots,
        customBesitzer,
        depotStartingCash
      };

      const metadataBody: any = {
        name: backupFilename,
        mimeType: "application/json",
        description: "Morgenroutine & Portfolio unbestechliche System-Datensicherung V8",
      };

      if (targetFolderId) {
        metadataBody.parents = [targetFolderId];
      }

      // 1. Create file metadata in Google Drive
      const metadataRes = await fetch("https://www.googleapis.com/drive/v3/files", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(metadataBody),
      });

      if (!metadataRes.ok) {
        const errText = await metadataRes.text();
        console.error("Metadata creation failed:", metadataRes.status, errText);
        
        if (metadataRes.status === 403 || errText.includes("disabled") || errText.includes("Google Drive API")) {
          throw new Error("DRIVE_API_NOT_ENABLED");
        }
        throw new Error(`Status ${metadataRes.status} - ${errText}`);
      }
      
      const metadata = await metadataRes.json();
      const fileId = metadata.id;

      // 2. Upload file content
      const contentRes = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(appState, null, 2),
        }
      );

      if (contentRes.ok) {
        onShowToast("Google Drive", `🟢 Backup '${backupFilename}' erfolgreich in deinem Google Drive gespeichert!`, "success");
        fetchDriveBackups();
      } else {
        const errText = await contentRes.text();
        console.error("Content upload failed:", contentRes.status, errText);
        throw new Error(`Status ${contentRes.status} - ${errText}`);
      }
    } catch (error: any) {
      console.error("Backup failed:", error);
      if (error?.message === "DRIVE_API_NOT_ENABLED") {
        onShowToast(
          "API nicht aktiviert", 
          "❌ Fehler: Die 'Google Drive API' ist in deiner GCP Console deaktiviert. Bitte aktiviere die 'Google Drive API' in deinem GCP-Projekt!", 
          "error"
        );
      } else {
        onShowToast(
          "Google Drive Fehler", 
          `Das Backup konnte nicht hochgeladen werden (${error?.message || "Netzwerkfehler"}).`, 
          "error"
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRestoreBackup = async (fileId: string, fileName: string) => {
    if (!window.confirm(`Möchtest du wirklich das unbestechliche Backup '${fileName}' wiederherstellen? Dies überschreibt deinen aktuellen Applikations-Status!`)) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (response.ok) {
        const state = await response.json();
        
        // Unbestechliche validation before restore
        if (!state.marketState || !state.livePrices) {
          throw new Error("Invalid backup schema");
        }

        onMarketStateChange(state.marketState);
        onLivePricesChange(state.livePrices);
        if (state.portfolioData) onPortfolioDataChange(state.portfolioData);
        if (state.checklistData) onChecklistDataChange(state.checklistData);
        if (state.soldTrades) onSoldTradesChange(state.soldTrades);
        if (state.portfolioPurchases) onPortfolioPurchasesChange(state.portfolioPurchases);
        if (state.customDepots && Array.isArray(state.customDepots)) onCustomDepotsChange(state.customDepots);
        if (state.customBesitzer && Array.isArray(state.customBesitzer)) onCustomBesitzerChange(state.customBesitzer);
        if (state.depotStartingCash) onDepotStartingCashChange(state.depotStartingCash);

        onShowToast("Wiederherstellt", `🟢 System erfolgreich aus '${fileName}' rekonstruiert!`, "success");
      } else {
        throw new Error("Restore retrieve failed");
      }
    } catch (error) {
      console.error("Restore failed:", error);
      onShowToast("Rekonstruktion Fehler", "Das Backup-File enthält kein gültiges Format.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteBackup = async (fileId: string) => {
    if (!window.confirm("Dieses Backup unwiderruflich aus deinem Google Drive löschen?")) return;
    
    try {
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (response.ok) {
        onShowToast("Gelöscht", "Backup-Datei wurde aus Google Drive entfernt.", "success");
        fetchDriveBackups();
      }
    } catch (err) {
      console.error("Error deleting backup:", err);
    }
  };

  // ==========================================
  // GOOGLE SHEETS LIVE EXPORT
  // ==========================================
  const handleExportToGoogleSheet = async () => {
    if (!accessToken) {
      onShowToast("Anmeldung erforderlich", "Bitte melde dich bei Google Workspace an.", "error");
      return;
    }

    setSheetsApiError(null);
    setSheetsApiErrorUrl(null);
    setIsLoading(true);
    try {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      const formattedDate = routineDate.replace(/-/g, "");
      
      const vixVal = marketState.vix !== null && marketState.vix !== undefined ? marketState.vix.toFixed(2) : "0.00";
      const vxvVal = marketState.vxv !== null && marketState.vxv !== undefined ? marketState.vxv.toFixed(2) : "0.00";
      const ratioVal = marketState.vix && marketState.vxv ? (marketState.vix / marketState.vxv).toFixed(2) : "0.00";
      const vvixVal = marketState.vvix !== null && marketState.vvix !== undefined ? marketState.vvix.toFixed(2) : "0.00";
      const spxVal = "7519.10"; // Custom stable tracking benchmark
      const wtiVal = marketState.wti !== null && marketState.wti !== undefined ? marketState.wti.toFixed(2) : "0.00";
      const gasVal = marketState.gas !== null && marketState.gas !== undefined ? marketState.gas.toFixed(2) : "0.00";
      const tslaLive = livePrices.tsla.price !== null && livePrices.tsla.price !== undefined ? livePrices.tsla.price.toFixed(2) : "0.00";
      const babaLive = livePrices.baba.price !== null && livePrices.baba.price !== undefined ? livePrices.baba.price.toFixed(2) : "0.00";
      const nowLive = livePrices.now.price !== null && livePrices.now.price !== undefined ? livePrices.now.price.toFixed(2) : "0.00";
      const btcLive = livePrices.btc.price !== null && livePrices.btc.price !== undefined ? livePrices.btc.price.toFixed(2) : "0.00";
      
      const isSystemGreen = (marketState.wti !== null && marketState.wti < 100 && marketState.gas !== null && marketState.gas < 4.5 && marketState.vix !== null && marketState.vxv !== null && (marketState.vix / marketState.vxv) < 1.0 && marketState.vix < 25);
      const statusText = isSystemGreen ? "GREEN" : "RED/RESTRIKTIV";

      let commentText = `VIX bei ${vixVal} im Contango (${ratioVal}). `;
      if (marketState.wti !== null && marketState.wti >= 100) {
        commentText += `Sperre aktiv wegen Energiesektor (WTI Öl).`;
      } else if (marketState.gas !== null && marketState.gas >= 4.5) {
        commentText += `Sperre aktiv wegen Energiesektor (Erdgas).`;
      } else {
        commentText += `WTI Öl (${wtiVal} $) und Erdgas (${gasVal} $) unbestechlich unter Schutzgrenzen.`;
      }

      const rowValues = [
        formattedDate, vixVal, vxvVal, ratioVal, vvixVal, spxVal,
        wtiVal, gasVal, tslaLive, babaLive, nowLive, btcLive,
        statusText, commentText
      ];

      const headers = [
        "Datum", "VIX", "VXV", "Vola-Verhältnis", "VVIX", "SPX Kurs", 
        "WTI Öl ($)", "Erdgas ($)", "TSLA live (€)", "BABA live (€)", 
        "NOW live (€)", "BTC live (€)", "Systemstatus", "Pareto-Kommentar / Makrobewertung"
      ];

      if (sheetExportMode === "new_file") {
        // ALWAYS create a brand-new Spreadsheet file for the current routine
        const sheetTitle = `Morgenroutine_Journal_${formattedDate}_${hh}${mm}_MEZ`;
        
        const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            properties: {
              title: sheetTitle,
            },
            sheets: [
              {
                properties: {
                  title: "Tages_Journal",
                  gridProperties: { rowCount: 1000, columnCount: 15 },
                },
              },
            ],
          }),
        });

        if (!createRes.ok) {
          let errMsg = "Grund unbekannt";
          let apiSheetsUrl = "";
          try {
            const errJson = await createRes.json();
            errMsg = errJson.error?.message || JSON.stringify(errJson);
            const urlMatch = errMsg.match(/https?:\/\/[^\s]+/);
            if (urlMatch) apiSheetsUrl = urlMatch[0];
          } catch (_) {
            try {
              errMsg = await createRes.text();
              const urlMatch = errMsg.match(/https?:\/\/[^\s]+/);
              if (urlMatch) apiSheetsUrl = urlMatch[0];
            } catch (__) {}
          }

          if (createRes.status === 403 && (errMsg.includes("disabled") || errMsg.includes("not been used") || errMsg.includes("SERVICE_DISABLED"))) {
            if (!apiSheetsUrl && clientId) {
              const matchProject = clientId.match(/^(\d+)/);
              if (matchProject) {
                apiSheetsUrl = `https://console.developers.google.com/apis/api/sheets.googleapis.com?project=${matchProject[1]}`;
              }
            }
            setSheetsApiError("disabled");
            setSheetsApiErrorUrl(apiSheetsUrl || "https://console.developers.google.com/apis/api/sheets.googleapis.com");
          }
          throw new Error(`Erstellung der Tabelle im Drive fehlgeschlagen (HTTP ${createRes.status}): ${errMsg}`);
        }
        const sheetData = await createRes.json();
        const newSheetId = sheetData.spreadsheetId;

        // In Zielordner verschieben, falls verknüpft (mit vollständigem Entfernen aus Root)
        if (targetFolderId) {
          try {
            const fileGet = await fetch(`https://www.googleapis.com/drive/v3/files/${newSheetId}?fields=parents`, {
              headers: { Authorization: `Bearer ${accessToken}` }
            });
            let removeStr = "";
            if (fileGet.ok) {
              const fileData = await fileGet.json();
              if (fileData.parents && fileData.parents.length > 0) {
                removeStr = `&removeParents=${fileData.parents.join(",")}`;
              }
            }
            await fetch(`https://www.googleapis.com/drive/v3/files/${newSheetId}?addParents=${targetFolderId}${removeStr}`, {
              method: "PATCH",
              headers: { 
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json"
              },
              body: "{}"
            });
          } catch (folderErr) {
            console.warn("Verschieben in Ordner fehlgeschlagen:", folderErr);
          }
        }

        // Write Headers to Row 1
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${newSheetId}/values/Tages_Journal!A1:N1?valueInputOption=USER_ENTERED`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ values: [headers] }),
        });

        // Write Data to Row 2
        await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${newSheetId}/values/Tages_Journal!A2:N2?valueInputOption=USER_ENTERED`, {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ values: [rowValues] }),
        });

        onShowToast("Tabelle erstellt", `🟢 Neue Journal-Tabelle '${sheetTitle}' erfolgreich in deinem Google Drive angelegt!`, "success");
      } else {
        // APPEND MODE to a single central spreadsheet
        let sheetId = targetSpreadsheetId;
        
        // 1. If blank, create a new spreadsheet for the user automatically!
        if (!sheetId) {
          const sheetTitle = `Morgenroutine_Journal_${formattedDate}_${hh}${mm}_MEZ`;
          const createRes = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              properties: {
                title: sheetTitle,
              },
              sheets: [
                {
                  properties: {
                    title: "Tages_Journal",
                    gridProperties: { rowCount: 1000, columnCount: 15 },
                  },
                },
              ],
            }),
          });

          if (!createRes.ok) {
            let errMsg = "Grund unbekannt";
            let apiSheetsUrl = "";
            try {
              const errJson = await createRes.json();
              errMsg = errJson.error?.message || JSON.stringify(errJson);
              const urlMatch = errMsg.match(/https?:\/\/[^\s]+/);
              if (urlMatch) apiSheetsUrl = urlMatch[0];
            } catch (_) {
              try {
                errMsg = await createRes.text();
                const urlMatch = errMsg.match(/https?:\/\/[^\s]+/);
                if (urlMatch) apiSheetsUrl = urlMatch[0];
              } catch (__) {}
            }

            if (createRes.status === 403 && (errMsg.includes("disabled") || errMsg.includes("not been used") || errMsg.includes("SERVICE_DISABLED"))) {
              if (!apiSheetsUrl && clientId) {
                const matchProject = clientId.match(/^(\d+)/);
                if (matchProject) {
                  apiSheetsUrl = `https://console.developers.google.com/apis/api/sheets.googleapis.com?project=${matchProject[1]}`;
                }
              }
              setSheetsApiError("disabled");
              setSheetsApiErrorUrl(apiSheetsUrl || "https://console.developers.google.com/apis/api/sheets.googleapis.com");
            }
            throw new Error(`Erstellung der Sammeltabelle fehlgeschlagen (HTTP ${createRes.status}): ${errMsg}`);
          }
          const sheetData = await createRes.json();
          sheetId = sheetData.spreadsheetId;
          
          // Persist Spreadsheet ID in app settings
          setTargetSpreadsheetId(sheetId);
          localStorage.setItem("g_workspace_spreadsheet_id", sheetId);

          // In Zielordner verschieben, falls verknüpft (mit vollständigem Entfernen aus Root)
          if (targetFolderId) {
            try {
              const fileGet = await fetch(`https://www.googleapis.com/drive/v3/files/${sheetId}?fields=parents`, {
                headers: { Authorization: `Bearer ${accessToken}` }
              });
              let removeStr = "";
              if (fileGet.ok) {
                const fileData = await fileGet.json();
                if (fileData.parents && fileData.parents.length > 0) {
                  removeStr = `&removeParents=${fileData.parents.join(",")}`;
                }
              }
              await fetch(`https://www.googleapis.com/drive/v3/files/${sheetId}?addParents=${targetFolderId}${removeStr}`, {
                method: "PATCH",
                headers: { 
                  Authorization: `Bearer ${accessToken}`,
                  "Content-Type": "application/json"
                },
                body: "{}"
              });
            } catch (folderErr) {
              console.warn("Verschieben in Ordner fehlgeschlagen:", folderErr);
            }
          }

          await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Tages_Journal!A1:N1?valueInputOption=USER_ENTERED`, {
            method: "PUT",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ values: [headers] }),
          });
        }

        // Append row to Google Sheets
        const appendRes = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Tages_Journal!A:N:append?valueInputOption=USER_ENTERED`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              values: [rowValues],
            }),
          }
        );

        if (appendRes.ok) {
          onShowToast("Google Sheets", "🟢 Tages-Journal-Eintrag erfolgreich in Google Sheets angehängt!", "success");
        } else {
          throw new Error("Fehler beim Einfügen in die Sammeltabelle. Die Tabellen-ID existiert nicht mehr oder du hast keine Rechte. Ggf. ID löschen oder oben 'Neue Datei pro Tag' aktivieren.");
        }
      }
    } catch (err: any) {
      console.error("Sheets export failed:", err);
      onShowToast("Sheets Fehler", err.message || "Export in Tabelle fehlgeschlagen. Bitte prüfe die Tabellen-ID.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // ==========================================
  // GOOGLE DOCS rule EXPORT
  // ==========================================
  const handleExportRulesToGoogleDoc = async () => {
    if (!accessToken) {
      onShowToast("Anmeldung erforderlich", "Bitte melde dich bei Google Workspace an.", "error");
      return;
    }

    setDocsApiError(null);
    setDocsApiErrorUrl(null);
    setIsLoading(true);
    try {
      let docId = targetDocumentId;

      const now = new Date();
      const hh = String(now.getHours()).padStart(2, "0");
      const mm = String(now.getMinutes()).padStart(2, "0");
      const docTitle = `Morgenroutine_Master-Regelwerk_${routineDate.replace(/-/g, "")}_${hh}${mm}_MEZ`;

      // 1. Create beautiful Document
      const createRes = await fetch("https://docs.googleapis.com/v1/documents", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: docTitle,
        }),
      });

      if (!createRes.ok) {
        let errMsg = "Grund unbekannt";
        let apiDocsUrl = "";
        try {
          const errJson = await createRes.json();
          errMsg = errJson.error?.message || JSON.stringify(errJson);
          
          // Suche nach URL in der Fehlermeldung
          const urlMatch = errMsg.match(/https?:\/\/[^\s]+/);
          if (urlMatch) {
            apiDocsUrl = urlMatch[0];
          }
        } catch (_) {
          try {
            errMsg = await createRes.text();
            const urlMatch = errMsg.match(/https?:\/\/[^\s]+/);
            if (urlMatch) {
              apiDocsUrl = urlMatch[0];
            }
          } catch (__) {}
        }

        // Prüfe auf GCP API-Disabled Fehler (HTTP 403)
        if (createRes.status === 403 && (errMsg.includes("disabled") || errMsg.includes("not been used") || errMsg.includes("SERVICE_DISABLED"))) {
          if (!apiDocsUrl && clientId) {
            const matchProject = clientId.match(/^(\d+)/);
            if (matchProject) {
              apiDocsUrl = `https://console.developers.google.com/apis/api/docs.google?project=${matchProject[1]}`;
            }
          }
          setDocsApiError("disabled");
          setDocsApiErrorUrl(apiDocsUrl || "https://console.developers.google.com/apis/api/docs.google");
        }
        
        throw new Error(`Erstellung der Dokumentdatei schlug fehl (HTTP ${createRes.status}): ${errMsg}`);
      }
      
      const docData = await createRes.json();
      docId = docData.documentId;

      // Update persisted Document ID
      setTargetDocumentId(docId);
      localStorage.setItem("g_workspace_document_id", docId);

      // In Zielordner verschieben, falls verknüpft (mit vollständigem Entfernen aus Root)
      if (targetFolderId) {
        try {
          const fileGet = await fetch(`https://www.googleapis.com/drive/v3/files/${docId}?fields=parents`, {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          let removeStr = "";
          if (fileGet.ok) {
            const fileData = await fileGet.json();
            if (fileData.parents && fileData.parents.length > 0) {
              removeStr = `&removeParents=${fileData.parents.join(",")}`;
            }
          }
          const moveRes = await fetch(`https://www.googleapis.com/drive/v3/files/${docId}?addParents=${targetFolderId}${removeStr}`, {
            method: "PATCH",
            headers: { 
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json"
            },
            body: "{}"
          });
          if (!moveRes.ok) {
            const moveErrText = await moveRes.text();
            console.warn("Verschieben in Ordner fehlgeschlagen:", moveErrText);
          }
        } catch (folderErr) {
          console.warn("Verschieben in Ordner fehlgeschlagen:", folderErr);
        }
      }

      // Build gorgeous rule compilation
      const dynamicRulesText = `
UNBESTECHLICHES SYSTEM-JOURNAL & REGELWERK
Generiert am: ${routineDate} - fenzl@fenzlakustik.at

---------------------------------------------------------
1. DIE CORE-LOGIKEN (Claude Memory Sync & "Clean Slate")
---------------------------------------------------------
• Eiserner "Clean Slate" Start: Live-Felder laden stur leer (null) um systematische "Geisterwerte" komplett zu verhindern.
• VIX / VXV-Verhältnis: Contango (< 1.0) ist zwingendes Primat für Neukäufe. Backwardation (>= 1.0) führt zu absoluter Kauf-Sperre!

---------------------------------------------------------
2. DIE AKTUELLEN WERTE DER MORGENROUTINE
---------------------------------------------------------
• VIX Index: ${marketState.vix !== null ? marketState.vix.toFixed(2) : "FEHLT"}
• VXV (3 Monate): ${marketState.vxv !== null ? marketState.vxv.toFixed(2) : "FEHLT"}
• VIX/VXV-Verhältnis: ${marketState.vix && marketState.vxv ? (marketState.vix / marketState.vxv).toFixed(2) : "DEAKTIVIERT"}
• WTI Rohöl Limit-Check: ${marketState.wti !== null ? marketState.wti.toFixed(2) + " $" : "FEHLT"} (Sperre ab 100,00 USD)
• Erdgas Limit-Check: ${marketState.gas !== null ? marketState.gas.toFixed(2) + " $" : "FEHLT"} (Sperre ab 4,50 USD)
• Distribution Days (S&P 500): ${marketState.distSpx} / (Nasdaq 100): ${marketState.distNdx}

---------------------------------------------------------
3. DYNAMISCHES RISK & STOP-LOSS MANAGEMENT (2x ATR)
---------------------------------------------------------
Stop-Loss wird unbestechlich abgebildet: Calculated Stop = MAX(Harter Anker, Kurs - (2 * ATR))

Pro Position trägt der User in der App ein:
• Hartes Anker-Niveau (€ — niemals nach unten verschoben)
• Kauflimit (€ — ab welchem Kurs eine neue Tranche aktiv wird)
• Tranchengröße (€ — wie viel Risiko bei diesem Stop)
Spar-Pläne (z. B. Crypto-Indizes) können ohne Stop-Loss laufen, wenn sie als HODL-Bestand markiert sind.

---------------------------------------------------------
4. ÖSTERREICHISCHE STEUERBESTIMMUNGEN (GELDWERTER SCHUTZ)
---------------------------------------------------------
• In Österreich unterliegen Gewinne und Dividenden einer festen KESt von 27,5%.
• Da DADAT ein inländischer, in Österreich steuereinfacher Broker ist, wird die Abgabe vollautomatisch abgeführt.
• Ein automatischer Verlustausgleich innerhalb des Kalenderjahres erfolgt direkt im Hintergrund.

---------------------------------------------------------
5. DIE 7 GRÖSSTEN DENKFEHLER (Rene - Master Your Trade)
---------------------------------------------------------
1. Bestätigungsfehler: Nur nach rechtfertigenden Informationen suchen, Bear-Case ignorieren.
2. Verlustaversion: Gewinne zu früh einfrieren, Verluste stur aussitzen.
3. FOMO (Fear Of Missing Out): Impulsives Springen in grüne Kerzen.
4. Rache-Trading: Verluste überstürzt ausgleichen wollen.
5. Überheblichkeit: Vernachlässigung des Positionsgrößenrechners nach Gewinnserien.
6. Anker-Effekt: Festhalten an einstigen All-Time-Highs.
7. Emotionale Abhängigkeit: Handeln außerhalb der erprobten Setups Regelwerke.

Dokument unbestechlich fertiggestellt.
      `;

      // Insert formatted content into Google Docs
      const insertRes = await fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          requests: [
            {
              insertText: {
                location: { index: 1 },
                text: dynamicRulesText,
              },
            },
          ],
        }),
      });

      if (!insertRes.ok) {
        let errMsg = "Grund unbekannt";
        try {
          const errJson = await insertRes.json();
          errMsg = errJson.error?.message || JSON.stringify(errJson);
        } catch (_) {
          try {
            errMsg = await insertRes.text();
          } catch (__) {}
        }
        throw new Error(`Master-Inhalt einfügen schlug fehl (HTTP ${insertRes.status}): ${errMsg}`);
      }

      onShowToast("Google Docs", "🟢 Master-Regelwerk erfolgreich als Google Doc erstellt!", "success");
      window.open(`https://docs.google.com/document/d/${docId}/edit`, "_blank");
    } catch (err: any) {
      console.error("Docs export failed:", err);
      onShowToast("Docs Fehler", err.message || "Export in Google Doc ist fehlgeschlagen.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadLocalJson = () => {
    try {
      const dateObj = new Date();
      const hh = String(dateObj.getHours()).padStart(2, "0");
      const mm = String(dateObj.getMinutes()).padStart(2, "0");
      const filename = `Morgenroutine_backup_${routineDate.replace(/-/g, "")}_${hh}${mm}_MEZ_local.json`;

      const appState = {
        meta: {
          appVersion: "V8",
          compiledAt: "2026-06-01",
          authorEmail: "fenzl@fenzlakustik.at",
          date: routineDate,
          generatedUtc: dateObj.toISOString()
        },
        marketState,
        livePrices,
        portfolioData,
        checklistData,
        soldTrades,
        portfolioPurchases,
        customDepots,
        customBesitzer,
        depotStartingCash
      };

      const jsonString = JSON.stringify(appState, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", url);
      downloadAnchor.setAttribute("download", filename);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      URL.revokeObjectURL(url);

      onShowToast("Lokaler Download", "🟢 Backup-Datei erfolgreich lokal heruntergeladen!", "success");
    } catch (err) {
      console.error(err);
      onShowToast("Download Fehler", "Fehler beim Erstellen der Backup-Datei.", "error");
    }
  };

  const handleUploadLocalJson = (event: ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    const file = event.target.files?.[0];
    if (!file) return;

    fileReader.onload = (e) => {
      try {
        const parsedState = JSON.parse(e.target?.result as string);
        
        // Unbestechliche Formatskontrolle
        if (!parsedState.marketState || !parsedState.livePrices) {
          throw new Error("Ungültiges Schema");
        }

        onMarketStateChange(parsedState.marketState);
        onLivePricesChange(parsedState.livePrices);
        if (parsedState.portfolioData) onPortfolioDataChange(parsedState.portfolioData);
        
        const listData = parsedState.checklistData || parsedState.checklistState;
        if (listData) onChecklistDataChange(listData);
        
        if (parsedState.soldTrades) onSoldTradesChange(parsedState.soldTrades);
        if (parsedState.portfolioPurchases) onPortfolioPurchasesChange(parsedState.portfolioPurchases);
        
        if (parsedState.customDepots && Array.isArray(parsedState.customDepots)) onCustomDepotsChange(parsedState.customDepots);
        if (parsedState.customBesitzer && Array.isArray(parsedState.customBesitzer)) onCustomBesitzerChange(parsedState.customBesitzer);
        if (parsedState.depotStartingCash) onDepotStartingCashChange(parsedState.depotStartingCash);

        onShowToast("Lokales Backup", "🟢 System erfolgreich aus lokaler Datei rekonstruiert!", "success");
      } catch (error) {
        console.error("Local restore failed:", error);
        onShowToast("Import Fehler", "Die Datei enthält kein gültiges Morgenroutine-Datenformat.", "error");
      }
    };

    fileReader.readAsText(file);
    event.target.value = "";
  };

  const handleCopyCSVLine = () => {
    navigator.clipboard.writeText(csvExportString).then(() => {
      onShowToast(
        "Excel-Zeile kopiert",
        "📋 CSV-Zeile wurde in die Zwischenablage kopiert. Mit Strg+V in dein Excel-Journal einfügen.",
        "success"
      );
    }).catch(() => {
      onShowToast(
        "Kopier-Fehler",
        "Kopieren in die Zwischenablage fehlgeschlagen. Wähle den Text im Feld manuell aus.",
        "error"
      );
    });
  };

  const handleCopyCodeToClipboard = () => {
    // Generate reconstruction blueprint file output for AI upload
    const codeFormat = `
# MORGENROUTINE SYSTEM-RECONSTRUCTION BLUEPRINT
==============================================
Date: 2026-06-01 (Morgenroutine V8)
Author: fenzl@fenzlakustik.at

[SYSTEMSTATE]
vix=${marketState.vix}
vxv=${marketState.vxv}
vvix=${marketState.vvix}
wti=${marketState.wti}
gas=${marketState.gas}
distSpx=${marketState.distSpx}
distNdx=${marketState.distNdx}

[LIVEPRICES]
tsla_price=${livePrices.tsla.price}
tsla_atr=${livePrices.tsla.atr}
now_price=${livePrices.now.price}
now_atr=${livePrices.now.atr}
baba_price=${livePrices.baba.price}
baba_atr=${livePrices.baba.atr}
btc_price=${livePrices.btc.price}

[CSVLINE]
${csvExportString}
    `.trim();

    navigator.clipboard.writeText(codeFormat);
    onShowToast("Blueprint kopiert", "Rekonstruktions-Dossier (System-Backup) wurde in die Zwischenablage kopiert! Bereit zum Senden an Gemini.", "success");
  };

  const renderCopyablePrompt = (title: string, desc: string, promptText: string) => {
    const isCopied = copiedText === promptText;
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2 relative transition-all hover:bg-slate-100/50">
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="text-[9px] font-extrabold text-slate-900 bg-slate-50 border border-slate-200/40 px-2 py-0.5 rounded-md uppercase tracking-wider block w-fit">
              KI-Chat Vorlage (Prompt)
            </span>
            <h5 className="text-[11px] font-bold text-slate-800 mt-1">{title}</h5>
          </div>
          <button
            type="button"
            onClick={() => {
              navigator.clipboard.writeText(promptText);
              setCopiedText(promptText);
              onShowToast("Kopiert", "Prompt wurde erfolgreich in deine Zwischenablage kopiert!", "success");
              setTimeout(() => setCopiedText(null), 2000);
            }}
            className={`h-7 px-3 rounded-lg font-bold text-[9px] uppercase transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer border ${
              isCopied
                ? "bg-emerald-600 text-white border-emerald-500 hover:bg-emerald-700"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            {isCopied ? (
              <>
                <CheckCircle className="h-3 w-3 shrink-0" /> Kopiert!
              </>
            ) : (
              <>
                <Copy className="h-3 w-3 shrink-0" /> Kopieren
              </>
            )}
          </button>
        </div>
        <p className="text-[10px] text-slate-500 leading-normal font-semibold">{desc}</p>
        <div className="bg-white border border-slate-200 rounded-xl p-2.5 font-mono text-[9.5px] text-slate-650 max-h-24 overflow-y-auto select-all leading-relaxed whitespace-pre-wrap font-semibold">
          {promptText}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Header Card with Connection Status */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-800">
            <FolderSync className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Google Workspace Synchronisations-Center</h2>
            <p className="text-xs text-slate-500 font-medium">Lade, sichere und exportiere unbestechlich in Google Drive, Sheets und Docs.</p>
          </div>
        </div>

        {accessToken ? (
          <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 p-3 rounded-2xl self-start md:self-auto">
            {userInfo?.picture ? (
              <img src={userInfo.picture} alt="Google Profil" className="h-9 w-9 rounded-full border border-emerald-200" referrerPolicy="no-referrer" />
            ) : (
              <div className="h-9 w-9 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 font-bold text-xs uppercase">
                {userInfo?.name.substring(0, 2) || "G"}
              </div>
            )}
            <div className="text-left">
              <span className="block text-xs font-bold text-emerald-950 leading-none">{userInfo?.name || "Angemeldet"}</span>
              <span className="block text-[10px] text-emerald-700 mt-0.5">{userInfo?.email || "Google Workspace verbunden"}</span>
            </div>
            <button 
              onClick={handleSignOut}
              className="ml-2 h-8 w-8 text-rose-600 hover:text-rose-800 hover:bg-rose-50/50 rounded-xl flex items-center justify-center transition-colors cursor-pointer"
              title="Abmelden"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleOAuthLogin}
              className="px-5 h-11 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs uppercase tracking-wide rounded-xl shadow-md transition-all active:scale-98 cursor-pointer flex items-center gap-2"
            >
              <ShieldCheck className="h-4 w-4" /> Mit Google Anmelden
            </button>
            <button
              onClick={() => setIsShowingCustomKey(!isShowingCustomKey)}
              className="px-4 h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wide rounded-xl border border-slate-200 transition-colors cursor-pointer"
            >
              Tasteneingabe
            </button>
          </div>
        )}
      </div>

      {/* Manual token injection popup drawer */}
      {isShowingCustomKey && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl text-white animate-fade">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest flex items-center gap-2">
              <Key className="h-4 w-4 text-amber-400" /> Google OAuth Access-Token manuell eingeben
            </h3>
            <button onClick={() => setIsShowingCustomKey(false)} className="text-slate-400 hover:text-white">×</button>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed max-w-2xl mb-4">
            Du kannst hier direkt einen gültigen Google OAuth-Token eintragen. Das funktioniert sofort ohne Client-ID (z. B. aus der Google OAuth Playground-Konsole mit den Scopes Drive, Sheets und Docs).
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input 
              type="text" 
              value={customAccessToken}
              onChange={(e) => setCustomAccessToken(e.target.value)}
              placeholder="ya29.a0AxooC9..." 
              className="flex-1 h-11 bg-slate-950 border border-slate-800 rounded-xl px-4 text-xs font-mono text-slate-200 placeholder-slate-700 focus:outline-none focus:border-slate-600"
            />
            <button 
              onClick={handleApplyCustomToken}
              className="h-11 px-5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase rounded-xl transition-colors cursor-pointer"
            >
              Übernehmen &amp; Laden
            </button>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* 2. SECURITY LOCKBOX: LOCAL PROTOCOLS & REMOTE SYNC PANEL         */}
      {/* ================================================================ */}
      <div className="bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl text-white space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900/60 pb-5">
          <div className="flex items-start gap-3.5">
            <div className="p-3 bg-slate-600/10 border border-slate-600/20 rounded-2xl text-slate-400 shrink-0">
              <Key className="h-6 w-6 text-slate-400" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                Unbestechlicher Zugangsdaten-Tresor &amp; Profile-Manager
                <span className="bg-slate-600/20 border border-slate-600/30 text-slate-300 text-[9px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Sicher &amp; Synchron
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed font-medium">
                Speichere alle langen IDs (Google Client-ID, Spreadsheet-ID, Ordner-ID etc.) verschlüsselt ab. Andere User können deine ID-Sets in 1 Sekunde laden ohne jemals eigene Textnotizen öffnen zu müssen!
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-1">
          {/* SEC 1: LOKALE SPEICHERUNG & ORDNER */}
          <div className="bg-slate-950/40 border border-slate-900/40 p-5 rounded-2xl flex flex-col justify-between space-y-4">
            <div className="space-y-3.5">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-slate-400"></span>
                <h4 className="text-xs font-extrabold tracking-widest text-slate-300 uppercase">
                  Option A: Lokale Browser-Profile &amp; Dateiexport
                </h4>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed font-semibold">
                Sichere dein Setup direkt lokal in deinem Browser oder lade es als kleine Einstellungs-Datei (.json) herunter, um sie per E-Mail oder Chat mit Partnern oder Mitarbeitern zu teilen.
              </p>

              {/* Profile Dropdown */}
              <div className="space-y-1.5 pt-1">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Laufzeit-Profil auswählen</label>
                <div className="flex gap-2">
                  <select
                    value={selectedLocalProfileName}
                    onChange={(e) => handleLoadLocalProfile(e.target.value)}
                    className="flex-1 h-10 bg-slate-950 border border-slate-800 rounded-xl px-3 text-xs font-semibold text-slate-200 outline-none focus:border-slate-600 cursor-pointer"
                  >
                    <option value="">-- Letzte Sitzung (Standard) --</option>
                    {Object.keys(localProfiles).map((name) => (
                      <option key={name} value={name}>
                        👤 {name}
                      </option>
                    ))}
                  </select>

                  {selectedLocalProfileName && (
                    <button
                      type="button"
                      onClick={() => handleDeleteLocalProfile(selectedLocalProfileName)}
                      className="h-10 px-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-xl text-xs font-bold transition-all cursor-pointer"
                      title="Ausgewähltes lokales Profil löschen"
                    >
                      Löschen
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-900/30">
              <button
                type="button"
                onClick={() => handleSaveLocalProfile()}
                className="h-9 px-3.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-[10.5px] uppercase tracking-wide rounded-xl transition-all cursor-pointer"
              >
                💾 Als Profil sichern
              </button>

              <button
                type="button"
                onClick={handleExportProfileFile}
                className="h-9 px-3.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-750 rounded-xl font-bold text-[10.5px] uppercase tracking-wide transition-all cursor-pointer flex items-center justify-center gap-1"
                title="Erzeugt eine Einstellungsdatei zum Teilen"
              >
                <Download className="h-3 w-3" /> Profil exportieren
              </button>

              <label className="col-span-2 h-9 bg-slate-850 hover:bg-slate-800 text-slate-300 border border-slate-750 rounded-xl font-bold text-[10.5px] uppercase tracking-wide transition-all cursor-pointer flex items-center justify-center gap-1.5 mt-1">
                <Upload className="h-3 w-3 text-slate-400" /> Profil-Datei (.json) importieren
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportProfileFile}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* SEC 2: SCHNELLE CLOUD-SYNCHRONISIERUNG MIT PIN */}
          <div className="bg-slate-950/40 border border-slate-900/40 p-5 rounded-2xl flex flex-col justify-between space-y-4">
            <div className="space-y-3.5">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <h4 className="text-xs font-extrabold tracking-widest text-slate-300 uppercase">
                  Option B: Unbestechlicher Cloud-Sync (PIN-Teilen)
                </h4>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed font-semibold">
                Die genialste Lösung: Sichere dein komplettes ID-Set in unserer geschützten Online-Datenbank unter einem selbstgewählten Begriff. Andere Mitarbeiter können diese Daten weltweit durch Eingabe von Name und PIN sofort laden!
              </p>

              <div className="grid grid-cols-2 gap-3.5 pt-1">
                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Verbindungs-Name</label>
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="z.B. Fenzl-Zentrale"
                    className="w-full h-10 bg-slate-950 border border-slate-800 rounded-xl px-3 text-xs font-semibold text-slate-200 outline-none focus:border-slate-600 placeholder:text-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">Sicherheits-PIN</label>
                  <input
                    type="text"
                    maxLength={6}
                    value={profilePin}
                    onChange={(e) => setProfilePin(e.target.value.replace(/\D/g, ""))}
                    placeholder="z.B. 1234"
                    className="w-full h-10 bg-slate-950 border border-slate-800 rounded-xl px-3 text-xs font-mono font-bold tracking-widest text-slate-200 outline-none focus:border-slate-600 placeholder:text-slate-800 text-center"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-900/30">
              <button
                type="button"
                disabled={isCloudSyncLoading}
                onClick={handleCloudSaveProfile}
                className="flex-1 h-9.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-800 text-white font-bold text-[10.5px] uppercase tracking-wide rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isCloudSyncLoading ? "Sichert..." : "☁️ In Cloud sichern"}
              </button>

              <button
                type="button"
                disabled={isCloudSyncLoading}
                onClick={handleCloudLoadProfile}
                className="flex-1 h-9.5 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-800 text-white font-bold text-[10.5px] uppercase tracking-wide rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                {isCloudSyncLoading ? "Ruft ab..." : "☁️ Aus Cloud abrufen"}
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic status alert footer for the secure box */}
        <div className="bg-slate-950/60 p-3 rounded-2xl text-[10px] text-slate-350 flex items-center gap-2 border border-slate-900 leading-normal font-semibold">
          <span className="h-1.5 w-1.5 rounded-full bg-slate-600 shrink-0"></span>
          <span>
            <strong>Aktiver Status:</strong> {targetSpreadsheetId ? `Sammeltabelle verknüpft (ID: ...${targetSpreadsheetId.substring(Math.max(0, targetSpreadsheetId.length - 8))})` : "Tagesdatei-Modus"} 
            {clientId && ` | Google Client-ID geladen (ID: ...${clientId.substring(0, 10)}...)`}.
          </span>
        </div>
      </div>

      {/* 🔒 PIN-Backup — verschlüsselte Datei für die Aktien-Liste */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm mb-6">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 bg-slate-900 text-white rounded-xl flex items-center justify-center shrink-0">
            🔒
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-1">
              PIN-Backup deiner Aktien-Liste
            </h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Speichert Portfolio, Watchlist, Käufe und Verkäufe verschlüsselt in einer JSON-Datei. Lädt sich auf jedem Gerät mit dem gleichen PIN/Passwort wieder ein.
              Die App selbst sieht deinen PIN nie — Verschlüsselung läuft komplett im Browser.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onOpenBackupSetup}
                disabled={!onOpenBackupSetup}
                className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors active:scale-[0.98] disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                💾 Backup-Datei erstellen
              </button>
              <button
                type="button"
                onClick={onOpenBackupRestore}
                disabled={!onOpenBackupRestore}
                className="flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-900 text-sm font-semibold px-4 py-2.5 rounded-xl border border-slate-300 transition-colors active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                🔑 Backup-Datei laden
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 🎯 Demo-Daten — kleines Beispiel-Portfolio für neue User */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm mb-6">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl flex items-center justify-center shrink-0">
            🎯
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-1">
              Demo-Daten laden
            </h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Befüllt die App mit einem klar markierten Mini-Portfolio (TSLA + BTC, je 1 Demo-Kauf,
              AAPL/NVDA in der Watchlist, ein Demo-Depot). Damit kannst du jede Funktion ausprobieren,
              ohne eigene Werte eintragen zu müssen. Bestehende Daten werden nach Rückfrage überschrieben.
            </p>
            <button
              type="button"
              onClick={onLoadDemoData}
              disabled={!onLoadDemoData}
              className="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors active:scale-[0.98] disabled:bg-slate-300 disabled:cursor-not-allowed"
            >
              🎯 Demo-Portfolio aktivieren
            </button>
          </div>
        </div>
      </div>

      {/* Quick Excel CSV export — moved from header for less clutter */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm mb-6">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 bg-slate-100 border border-slate-200 rounded-xl flex items-center justify-center text-slate-700 shrink-0">
            <FileSpreadsheet className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-1">
              Excel-Zeile (CSV) für heute
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              Eine fertige CSV-Zeile mit allen Tageswerten. Per Klick in die Zwischenablage und mit Strg+V in dein Tages-Journal in Excel einfügen.
            </p>
            <textarea
              value={csvExportString}
              readOnly
              rows={2}
              className="w-full text-[11px] font-mono bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 select-all focus:outline-none focus:ring-2 focus:ring-slate-300 mb-3"
              onClick={(e) => (e.currentTarget as HTMLTextAreaElement).select()}
            />
            <button
              type="button"
              onClick={handleCopyCSVLine}
              className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-900 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors active:scale-95"
            >
              <FileSpreadsheet className="h-4 w-4" />
              CSV-Zeile in die Zwischenablage kopieren
            </button>
          </div>
        </div>
      </div>

      {/* Grid of integrations */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* 1. GOOGLE SHEET JOURNALING */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-md flex flex-col justify-between h-full hover:shadow-lg hover:shadow-slate-100 transition-all">
          <div className="space-y-4">
            <div className="h-12 w-12 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">1. Google Sheets</h3>
                <button
                  type="button"
                  onClick={() => setActiveHelpSection("sheets")}
                  className="h-5 w-5 rounded-full bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-850 font-extrabold text-[10.5px] flex items-center justify-center transition-all shadow-xs cursor-pointer select-none"
                  title="Hilfe zur Google Sheets Synchronisierung anzeigen"
                >
                  ?
                </button>
              </div>
              <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1">
                Übertrage deine täglichen Marktzustands- und Kursanalysen unbestechlich in eine Google Tabellen-Datenbank.
              </p>
            </div>

            {/* Export Mode Toggle */}
            <div className="space-y-1.5">
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wide">Export-Verhalten</label>
              <div className="grid grid-cols-2 gap-1 bg-slate-55 p-1 rounded-xl bg-slate-100/80 border border-slate-200/50">
                <button
                  type="button"
                  onClick={() => {
                    setSheetExportMode("new_file");
                    localStorage.setItem("g_workspace_sheet_export_mode", "new_file");
                  }}
                  className={`py-1.5 px-2 rounded-lg text-[9px] font-bold uppercase transition-all select-none cursor-pointer text-center ${
                    sheetExportMode === "new_file"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                  }`}
                >
                  Neue Datei pro Tag
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSheetExportMode("append");
                    localStorage.setItem("g_workspace_sheet_export_mode", "append");
                  }}
                  className={`py-1.5 px-2 rounded-lg text-[9px] font-bold uppercase transition-all select-none cursor-pointer text-center ${
                    sheetExportMode === "append"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-200"
                  }`}
                >
                  Sammeltabelle
                </button>
              </div>
            </div>

            {sheetExportMode === "append" ? (
              <div className="pt-1.5 animate-fadeIn">
                <label className="block text-[10px] font-bold text-slate-700 mb-1.5 uppercase">Google Spreadsheet ID (Optional)</label>
                <input
                  type="text"
                  value={targetSpreadsheetId}
                  onChange={(e) => {
                    setTargetSpreadsheetId(e.target.value);
                    localStorage.setItem("g_workspace_spreadsheet_id", e.target.value);
                  }}
                  disabled={!accessToken}
                  placeholder="ID der Sammeltabelle..."
                  className="w-full h-10 bg-slate-50 border border-slate-200 rounded-xl px-3 text-xs font-mono text-slate-900 focus:border-slate-600 focus:outline-none disabled:opacity-60"
                />
                <span className="text-[9px] text-slate-450 mt-1 block font-medium">Tippfehler oder gelöschtes Dokument führt zu &quot;Tabellen ID Fehler&quot;. Ggf. ID leeren!</span>
              </div>
            ) : (
              <div className="pt-1 animate-fadeIn p-3 bg-slate-50 rounded-2xl border border-slate-100/80">
                <span className="text-[10px] font-extrabold text-emerald-800 uppercase tracking-wider block mb-1 flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Tagesdatei-Modus aktiv
                </span>
                <p className="text-[10px] text-slate-500 leading-relaxed font-semibold">
                  Jeder Export erzeugt eine saubere Einzeltabelle wie: <br />
                  <code className="text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded font-mono font-bold select-all text-[9px] block mt-1 break-all">
                    Morgenroutine_Journal_20260423_0630_MEZ
                  </code>
                </p>
              </div>
            )}

            {sheetsApiError === "disabled" && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-2xl text-left space-y-1.5 animate-fadeIn mt-3">
                <span className="text-[10px] font-extrabold text-rose-800 uppercase tracking-wider block flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0" /> Sheets API nicht aktiviert
                </span>
                <p className="text-[10px] text-slate-650 leading-relaxed font-semibold">
                  Die Google Sheets API ist in deiner Google Cloud Console für dieses Projekt noch nicht aktiviert.
                </p>
                {sheetsApiErrorUrl && (
                  <a
                    href={sheetsApiErrorUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[9px] uppercase rounded-lg transition-colors cursor-pointer"
                  >
                    Jetzt aktivieren <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="pt-6 border-t border-slate-50 mt-4">
            <button
              onClick={handleExportToGoogleSheet}
              disabled={isLoading || !accessToken}
              className="w-full h-10 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-100 rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isLoading ? "Synchronisiere..." : sheetExportMode === "new_file" ? "Tabelle in Ordner erstellen" : "In Sammeltabelle einfügen"} <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* 2. GOOGLE DOCS RULE EXPORT */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-md flex flex-col justify-between h-full hover:shadow-lg hover:shadow-slate-100 transition-all">
          <div className="space-y-4">
            <div className="h-12 w-12 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center text-blue-600">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">2. Google Docs</h3>
                <button
                  type="button"
                  onClick={() => setActiveHelpSection("docs")}
                  className="h-5 w-5 rounded-full bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-850 font-extrabold text-[10.5px] flex items-center justify-center transition-all shadow-xs cursor-pointer select-none"
                  title="Hilfe zur Google Docs Erstellung anzeigen"
                >
                  ?
                </button>
              </div>
              <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1">
                Generiere dein vollständiges, fälschungssicheres Master-Regelwerk, inklusive der 7 Rene-Denkfehler und vordefinierten harten Anker, direkt in ein formatiertes Google Dokument.
              </p>
            </div>

            {docsApiError === "disabled" && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-2xl text-left space-y-1.5 animate-fadeIn">
                <span className="text-[10px] font-extrabold text-rose-800 uppercase tracking-wider block flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0" /> Docs API nicht aktiviert
                </span>
                <p className="text-[10px] text-slate-600 leading-relaxed font-semibold">
                  Die Google Docs API ist in deiner Google Cloud Console für dieses Projekt noch nicht aktiviert.
                </p>
                {docsApiErrorUrl && (
                  <a
                    href={docsApiErrorUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[9px] uppercase rounded-lg transition-colors cursor-pointer"
                  >
                    Jetzt aktivieren <ExternalLink className="h-2.5 w-2.5" />
                  </a>
                )}
              </div>
            )}
          </div>

          <div className="pt-6 border-t border-slate-50 mt-4">
            <button
              onClick={handleExportRulesToGoogleDoc}
              disabled={isLoading || !accessToken}
              className="w-full h-10 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-100 rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              {isLoading ? "Präpariere..." : "Regelwerk als Google Doc erstellen"} <ExternalLink className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* 3. GEMINI CODE-RESTORE BLUEPRINT & LOCAL JSON BACKUP MANAGER */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-md flex flex-col justify-between h-full hover:shadow-lg hover:shadow-slate-100 transition-all md:col-span-2 lg:col-span-1">
          <div className="space-y-4">
            <div className="h-12 w-12 bg-amber-50 border border-amber-100 rounded-xl flex items-center justify-center text-amber-600">
              <FileCode className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">3. Offline-Sicherung &amp; Gemini</h3>
                <button
                  type="button"
                  onClick={() => setActiveHelpSection("offline")}
                  className="h-5 w-5 rounded-full bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-850 font-extrabold text-[10.5px] flex items-center justify-center transition-all shadow-xs cursor-pointer select-none"
                  title="Hilfe zur Offline-Sicherung und dem Gemini-Blueprint anzeigen"
                >
                  ?
                </button>
              </div>
              <p className="text-xs text-slate-500 font-medium leading-relaxed mt-1">
                Sichere dein unbestechliches System-Dossier lokal als JSON-Datei oder lade es in Sekunden wieder hoch. Kopiere alternativ das Blueprint-Skript für eine neue Gemini-Session.
              </p>
            </div>
            <div className="bg-[#FAF9F5] border border-amber-200/50 p-4 rounded-2xl">
              <span className="block text-[10px] font-extrabold text-amber-900 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Database className="h-4 w-4" /> System-Rekonstruktions-Modus
              </span>
              <p className="text-[10px] text-slate-650 leading-relaxed font-semibold">
                Sämtliche Portfoliodaten, Alarme, Vola-Werte und Stops können offline per JSON-Datei übertragen oder als Gemini-Sondierungs-Dossier in die Zwischenablage kopiert werden.
              </p>
            </div>
          </div>

          <div className="pt-6 border-t border-slate-50 mt-4 space-y-2.5">
            <button
              onClick={handleDownloadLocalJson}
              className="w-full h-10 bg-slate-50 hover:bg-slate-100 text-slate-705 border border-slate-200 rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer text-slate-700"
            >
              <Download className="h-3.5 w-3.5" /> JSON herunterladen
            </button>

            <label className="w-full h-10 bg-slate-50 hover:bg-slate-100 text-slate-705 border border-slate-200 rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer text-slate-700">
              <Upload className="h-3.5 w-3.5" /> JSON hochladen
              <input 
                type="file" 
                accept=".json" 
                onChange={handleUploadLocalJson} 
                className="hidden" 
              />
            </label>

            <button
              onClick={handleCopyCodeToClipboard}
              className="w-full h-10 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Copy className="h-3.5 w-3.5" /> Blueprint kopieren
            </button>
          </div>
        </div>

      </div>

      {/* 4. GOOGLE DRIVE BACKUPS (Show full table if authorized) */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-4 gap-4 mb-4">
          <div className="flex items-start md:items-center justify-between gap-3 flex-1">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <Database className="h-4.5 w-4.5 text-slate-600" /> unbestechliche Datensicherungen (Google Drive Backups)
              </h3>
              <p className="text-xs text-slate-500 mt-1 font-medium">Verwalte vollwertige JSON-Zustände deines Dashboards, die direkt in deiner privaten Google Drive gesichert sind.</p>
            </div>
            <button
              type="button"
              onClick={() => setActiveHelpSection("drive")}
              className="h-5 w-5 rounded-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-900 font-extrabold text-[10.5px] flex items-center justify-center transition-all shadow-xs cursor-pointer select-none shrink-0"
              title="Hilfe zum Google Drive Backup-System anzeigen"
            >
              ?
            </button>
          </div>
          <button
            onClick={handleCreateBackup}
            disabled={isLoading || !accessToken}
            className="px-4 h-10 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-100 disabled:text-slate-400 text-white font-bold text-xs uppercase rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Upload className="h-4 w-4" /> Neues Backup hochladen
          </button>
        </div>

        {accessToken && (
          <div className="mb-6 bg-slate-50/50 border border-slate-200/60 rounded-2xl p-4 sm:p-5 space-y-4">
            <div>
              <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <FolderSync className="h-4 w-4 text-slate-600" /> Google Drive Backup-Speicherort
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed font-semibold">
                Wähle frei aus, wo Backups, Sheets und Docs abgelegt werden sollen. Erstelle einfach auf Knopfdruck einen sauberen Ordner namens <strong>&quot;Morgenroutine Backups&quot;</strong>, um deinen Drive-Root blitzblank zu halten.
              </p>
            </div>

            <div className="flex flex-col md:flex-row md:items-end gap-3">
              <div className="flex-1">
                <label className="block text-[9px] font-bold text-slate-400 mb-1 uppercase tracking-wide">
                  Google Drive Ordner-ID oder Web-Link (URL)
                </label>
                <input
                  type="text"
                  value={targetFolderId}
                  onChange={(e) => {
                    let val = e.target.value.trim();
                    
                    // Schlaue Erkennung: Falls der Benutzer eine Google Drive URL einfügt, die ID extrahieren
                    if (val.includes("drive.google.com")) {
                      const folderMatch = val.match(/\/folders\/([a-zA-Z0-9_-]+)/);
                      if (folderMatch && folderMatch[1]) {
                        val = folderMatch[1];
                        onShowToast("Link erkannt", "🟢 Ordner-ID erfolgreich aus der Google Drive Web-Adresse extrahiert!", "success");
                      } else {
                        const idParamMatch = val.match(/[?&]id=([a-zA-Z0-9_-]+)/);
                        if (idParamMatch && idParamMatch[1]) {
                          val = idParamMatch[1];
                          onShowToast("Link erkannt", "🟢 Ordner-ID erfolgreich aus der Google Drive Web-Adresse extrahiert!", "success");
                        }
                      }
                    }
                    
                    setTargetFolderId(val);
                    if (val) {
                      localStorage.setItem("g_workspace_backup_folder_id", val);
                    } else {
                      localStorage.removeItem("g_workspace_backup_folder_id");
                    }
                    setTimeout(() => fetchDriveBackups(val), 100);
                  }}
                  placeholder="ID (z. B. 1c_X...B) oder füge einfach den kompletten Google Drive Browser-Link hier ein"
                  className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 text-xs font-mono text-slate-900 focus:border-slate-600 focus:outline-none placeholder:text-slate-400 transition-all"
                />
                {folderIdWarning && (
                  <div className="mt-2 p-3 bg-amber-50 border border-amber-200/60 rounded-xl text-[11px] text-amber-900 leading-normal font-semibold animate-fadeIn">
                    {folderIdWarning}
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleSyncOrCreateFolder}
                  disabled={isLoading}
                  className="h-10 px-4 bg-slate-50 hover:bg-slate-100 active:bg-slate-200/80 text-slate-900 border border-slate-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Sucht nach dem Ordner 'Morgenroutine Backups' in deinem Drive oder erstellt ihn automatisch."
                >
                  <RefreshCcw className="h-3.5 w-3.5 text-slate-800 animate-pulse-subtle" /> Ordner automatisch erstellen &amp; nutzen
                </button>

                {targetFolderId && (
                  <button
                    type="button"
                    onClick={() => {
                      setTargetFolderId("");
                      localStorage.removeItem("g_workspace_backup_folder_id");
                      onShowToast("Zurückgesetzt", "🟢 Speicherort wird wieder auf Hauptverzeichnis (Root) zurückgesetzt.", "success");
                      setTimeout(() => fetchDriveBackups(""), 100);
                    }}
                    className="h-10 px-3.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Zurücksetzen
                  </button>
                )}
              </div>
            </div>

            {/* SPEZIAL-ERKLÄRUNG FÜR WINDOWS-PFADE VS. CLOUD-ID */}
            <div className="p-3.5 bg-slate-100/50 border border-slate-200/40 rounded-xl text-[11px] text-slate-600 leading-relaxed font-medium space-y-1.5">
              <span className="font-bold text-slate-800 block">💡 Lokaler Windows-Pfad (H:\...) vs. Google Drive Cloud-ID:</span>
              <p>
                Dein Pfad <code className="bg-slate-200/80 px-1 py-0.5 rounded text-[10px] text-slate-800 font-mono font-bold select-all">H:\Meine Ablage\...\! Morgenroutine KI</code> ist ein lokaler Windows-Ordnerpfad von deinem PC (erzeugt durch die &apos;Google Drive für Desktop&apos; App). 
                Diese Web-App läuft im Browser und kommuniziert direkt mit Google in der Cloud. Der Browser hat aus Sicherheitsgründen keinen Zugriff auf deinen lokalen Laufwerksbuchstaben <code className="bg-slate-200/85 px-1 font-mono text-slate-900 font-bold">H:</code>.
              </p>
              <p className="border-t border-slate-200/50 pt-1.5">
                <strong>Zwei einfache Lösungen, um deinen Wunschordner zu verknüpfen:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 pl-1 text-[10.5px]">
                <li>
                  <strong>Methode A (Einfachste):</strong> Trage deine genaue Ordner-ID <code className="bg-slate-200/80 px-1 py-0.5 rounded text-[10.5px] text-slate-900 font-mono font-bold select-all">1c_X1DWudBOLkeeKq4z0w8HSUioTkLPSB</code> oben ein.
                </li>
                <li>
                  <strong>Methode B (Bequem):</strong> Öffne den Ordner in deinem normalen Webbrowser. Kopiere einfach die <strong>Internetadresse (URL)</strong> oben aus der Adresszeile deines Browsers und füge sie oben ein. Die App zieht sich die ID automatisch daraus!
                </li>
              </ul>
            </div>

            {targetFolderId && (
              <div className="text-[10px] text-emerald-700 font-bold bg-emerald-50/50 border border-emerald-100 p-2.5 rounded-xl flex items-center gap-1.5 leading-none shadow-xs">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Aktiv: Alle Backups, Google Sheets und Docs werden automatisch in die Ordner-ID <strong>{targetFolderId}</strong> geleitet!</span>
              </div>
            )}
          </div>
        )}

        {!accessToken ? (
          <div className="bg-slate-50 border border-dashed border-slate-200 p-8 rounded-2xl text-center">
            <AlertTriangle className="h-8 w-8 text-slate-400 mx-auto" />
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mt-3">Anmeldung erforderlich</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
              Verbinde die App oben mit deinem Google-Konto, um deine Backup-Daten unkompliziert auszulesen, wiederherzustellen oder neue hochzuladen.
            </p>
          </div>
        ) : isLoading ? (
          <div className="py-12 flex flex-col items-center justify-center">
            <RefreshCcw className="h-8 w-8 text-slate-800 animate-spin" />
            <span className="text-xs text-slate-500 mt-3 font-semibold">Datenspeicher wird abgefragt...</span>
          </div>
        ) : backupFiles.length === 0 ? (
          <div className="bg-slate-50 border border-slate-100 p-8 rounded-2xl text-center">
            <CheckCircle className="h-8 w-8 text-slate-350 mx-auto" />
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide mt-3">Keine Sicherungen gefunden</h4>
            <p className="text-xs text-slate-500 mt-1">Klicke auf "Neues Backup hochladen", um deinen ersten Sicherheitszustand festzuschreiben.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-bold text-[10px] uppercase tracking-wider pb-3">
                  <th className="pb-3 text-left">Datei-Name</th>
                  <th className="pb-3 text-center">Erstellt am</th>
                  <th className="pb-3 text-right">Zustand &amp; Rekonstruktion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-medium">
                {backupFiles.map((file) => (
                  <tr key={file.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 text-slate-900 font-bold font-mono text-xs">{file.name}</td>
                    <td className="py-4 text-center text-slate-500 text-xs font-mono">
                      {new Date(file.createdTime).toLocaleString("de-DE")}
                    </td>
                    <td className="py-4 text-right">
                      <div className="flex items-center justify-end gap-2 text-xs">
                        <button
                          onClick={() => handleRestoreBackup(file.id, file.name)}
                          className="h-8 px-3.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                        >
                          <Download className="h-3.5 w-3.5" /> Wiederherstellen
                        </button>
                        <button
                          onClick={() => handleDeleteBackup(file.id)}
                          className="h-8 w-8 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                          title="Löschen"
                        >
                          ×
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. DYNAMIC MOBILE ACCESS & IPHONE SHORTCUT PREVIEW */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-md">
        <div className="flex flex-col lg:flex-row items-stretch gap-8">
          
          {/* Left Panel: Instructions with icons */}
          <div className="flex-1 space-y-6">
            <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
              <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl text-slate-800">
                <Smartphone className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest font-display">
                  📱 Mobiler Schnellzugriff &amp; iPhone Home-Bildschirm
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold font-mono mt-0.5">
                  LUMINA als Web-App mit eigenem unbestechlichen Home-Bildschirm Icon
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-semibold">
              Möchtest du LUMINA direkt auf deinem iPhone starten wie eine echte App? Wir haben für dich ein exklusives, hochauflösendes <strong>Launcher-Icon</strong> vorbereitet. Wenn du die App zu deinem Home-Bildschirm hinzufügst, erhältst du das perfekte Button-Design mit edlem Gold-Gehirn und Chart-Vektor.
            </p>

            <div className="space-y-4 text-xs font-semibold text-slate-650">
              <div className="flex items-start gap-3">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-slate-50 text-slate-800 border border-slate-100 font-bold text-[11px] shrink-0">1</span>
                <p className="leading-relaxed pt-0.5">
                  Öffne den <strong>direkten App-Link</strong> unten im Safari-Browser auf deinem iPhone. Du kannst den Link einfach kopieren oder den QR-Code rechts direkt mit deiner iPhone-Kamera scannen.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-slate-50 text-slate-800 border border-slate-100 font-bold text-[11px] shrink-0">2</span>
                <p className="leading-relaxed pt-0.5">
                  Tippe in der unteren Safari-Menüleiste auf das <strong>Teilen-Symbol (Share-Button)</strong> <span className="inline-block bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded font-bold">📤</span>.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-slate-50 text-slate-800 border border-slate-100 font-bold text-[11px] shrink-0">3</span>
                <p className="leading-relaxed pt-0.5">
                  Scrolle ein Stück nach unten und wähle die Option <strong>&quot;Zum Home-Bildschirm&quot;</strong> (Add to Home Screen) <span className="inline-block bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded font-bold">➕</span>.
                </p>
              </div>

              <div className="flex items-start gap-3">
                <span className="flex items-center justify-center h-6 w-6 rounded-full bg-slate-50 text-slate-800 border border-slate-100 font-bold text-[11px] shrink-0">4</span>
                <p className="leading-relaxed pt-0.5">
                  Name prüfen (<strong>Handels-Wächter</strong>) und oben rechts auf <strong>Hinzufügen</strong> klicken. Das Icon wird nun unbestechlich auf deinem iPhone-Home-Bildschirm platziert!
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-50">
              <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-wide">Direkter, unbestechlicher App-Link / Verknüpfung</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={window.location.origin}
                  className="flex-1 h-10 bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-mono text-slate-850 outline-none select-all"
                />
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.origin);
                    onShowToast("App-Link kopiert", "🟢 Der direkte Link wurde erfolgreich kopiert!", "success");
                  }}
                  className="h-10 px-4 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs uppercase rounded-xl transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Copy className="h-3.5 w-3.5" /> Kopieren
                </button>
              </div>
            </div>
          </div>

          {/* Right Panel: Stunning Interactive iPhone Preview & Scannable QR-Code */}
          <div className="w-full lg:w-80 bg-slate-50/70 border border-slate-100 rounded-3xl p-6 flex flex-col items-center justify-center text-center space-y-6">
            
            {/* Live iOS App Icon Mockup Preview */}
            <div className="space-y-2">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Vorschau auf deinem iPhone
              </span>
              <div className="relative group">
                {/* Outer shadow aura */}
                <div className="absolute -inset-1.5 bg-gradient-to-tr from-slate-600/20 to-emerald-500/20 rounded-[24%] blur-md opacity-75 group-hover:opacity-100 transition-opacity"></div>
                
                {/* Curved iOS App Icon Squirkle (Rounded 22%) */}
                <div className="relative h-24 w-24 bg-slate-900 rounded-[22%] border border-slate-200/20 shadow-xl overflow-hidden flex items-center justify-center">
                  <img 
                    src="/apple-touch-icon.png" 
                    alt="iPhone Touch Icon" 
                    className="h-full w-full object-cover rounded-[22%] scale-102"
                    referrerPolicy="no-referrer"
                  />
                  {/* Subtle gloss element typical for premium iOS buttons */}
                  <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-transparent to-black/10 opacity-70"></div>
                </div>
              </div>
              <span className="block text-xs font-bold text-slate-700 tracking-tight mt-2 select-none">
                Handels-Wächter
              </span>
            </div>

            {/* Live QR-Code Generator */}
            <div className="w-full border-t border-slate-200/60 pt-5 space-y-2 flex flex-col items-center">
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <QrCode className="h-3.5 w-3.5 text-slate-600" /> Direkt mit der Kamera scannen
              </span>
              <div className="bg-white p-2.5 rounded-2xl border border-slate-200/50 shadow-sm flex items-center justify-center">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&color=25-28-36&data=${encodeURIComponent(window.location.origin)}`} 
                  alt="Lumina QR Code" 
                  className="h-32 w-32 shrink-0 select-none animate-fadeIn"
                  referrerPolicy="no-referrer"
                />
              </div>
              <p className="text-[10px] text-slate-400 font-semibold leading-normal max-w-[200px]">
                Scrolle im Browser nach oben oder scanne diesen Code, um LUMINA sofort im Mobil-Layout zu starten.
              </p>
            </div>

          </div>
          
        </div>
      </div>

      {/* Handbuch für Anfänger - Setup-Anleitung im Google-Cloud-Look */}
      <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 space-y-6 shadow-md shadow-slate-100 animate-fade">
        <div className="flex items-center gap-3 border-b border-slate-50 pb-4">
          <div className="p-2 bg-slate-50 border border-slate-100 rounded-xl text-slate-800">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 uppercase tracking-widest font-display">
              🛠️ Google Cloud Platform (GCP) Anleitung für Anfänger
            </h3>
            <p className="text-[10px] text-slate-400 font-semibold font-mono mt-0.5">
              Schritt-für-Schritt-Konfiguration der Zugangsdaten (OAuth 2.0)
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed font-medium">
          Damit du dich sicher per Google anmelden kannst, benötigt die App eine eigene <strong>Google OAuth Client-ID</strong>. Folge dieser unbestechlichen Kurzanleitung (Dauer: ca. 2 Minuten):
        </p>

        {/* WICHTIGER HINWEIS FÜR DIE DRIVE-API AKTIVIERUNG */}
        <div className="p-4 bg-amber-50 border border-amber-200/80 rounded-2xl text-xs text-amber-900 font-medium space-y-1 animate-pulse-subtle">
          <p className="font-bold flex items-center gap-1.5 text-amber-950">
            <AlertTriangle className="h-4.5 w-4.5 text-amber-700 shrink-0" />
            WICHTIG: Erhältst du die Meldung &quot;API nicht aktiviert&quot;?
          </p>
          <p className="leading-relaxed pl-6">
            Google verlangt, dass du die <strong>Google Drive API</strong> für dein erstelltes Cloud-Projekt explizit einmalig einschaltest. 
            Klicke einfach auf diesen unbestechlichen Link, wähle oben dein Projekt aus und klicke auf <strong>&quot;Aktivieren&quot;</strong>:
          </p>
          <div className="pl-6 pt-1">
            <a 
              href="https://console.cloud.google.com/flows/enableapi?apiid=drive.googleapis.com" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="inline-flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1.5 rounded-lg text-[10px] uppercase tracking-wide transition-all shadow-sm cursor-pointer"
            >
              <ExternalLink className="h-3 w-3" /> Google Drive API aktivieren
            </a>
          </div>
        </div>

        <div className="space-y-4 text-xs font-medium text-slate-650">
          <div className="flex items-start gap-2">
            <span className="flex items-center justify-center h-5 w-5 rounded-full bg-slate-100 text-slate-705 font-bold text-[10px] mt-0.5 shrink-0">1</span>
            <p className="leading-relaxed">
              Öffne die <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="text-slate-800 hover:underline inline-flex items-center gap-0.5 font-bold">Google Cloud Console <ExternalLink className="h-3 w-3" /></a>. Erstelle ein neues Projekt oder wähle dein bestehendes aus.
            </p>
          </div>

          <div className="flex items-start gap-2">
            <span className="flex items-center justify-center h-5 w-5 rounded-full bg-slate-100 text-slate-705 font-bold text-[10px] mt-0.5 shrink-0">2</span>
            <p className="leading-relaxed">
              Gehe links im Menü auf <strong>APIs &amp; Dienste</strong> &rarr; <strong>OAuth-Zustimmungsbildschirm</strong>. Wähle "External" (oder "Internal" falls du Google Workspace nutzt) und fülle die Pflichtfelder (Name der App, Support-E-Mail) aus.
            </p>
          </div>

          <div className="flex items-start gap-2">
            <span className="flex items-center justify-center h-5 w-5 rounded-full bg-slate-100 text-slate-705 font-bold text-[10px] mt-0.5 shrink-0">3</span>
            <p className="leading-relaxed">
              Gehe danach auf den Reiter <strong>Anmeldedaten</strong> (Credentials), klicke oben auf <strong>+ Anmeldedaten erstellen</strong> und wähle <strong>OAuth-Client-ID</strong>. Wähle als Anwendungstyp <strong>Webanwendung</strong>.
            </p>
          </div>

          <div className="flex items-start gap-2">
            <span className="flex items-center justify-center h-5 w-5 rounded-full bg-slate-100 text-slate-705 font-bold text-[10px] mt-0.5 shrink-0">4</span>
            <div className="space-y-3 flex-1">
              <p className="leading-relaxed">
                Trage nun die Werte genau so ein, wie sie in deinem Google Dienst im Screenshot gefordert werden:
              </p>

              {/* GOOGLE REPLICA UI FOR AUTHORISED JAVASCRIPT ORIGINS */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 text-left space-y-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-blue-500"></div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    Autorisierte JavaScript-Quellen <span className="text-slate-400 font-normal text-xs">?</span>
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                    Dieses Feld kann für Anfragen über einen Browser verwendet werden.
                  </p>
                </div>
                
                <div className="space-y-1.5">
                  <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wide">URIs 1 *</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      readOnly
                      value={window.location.origin}
                      className="flex-1 h-9 bg-white border border-slate-300 rounded-lg px-3 font-mono text-[11px] text-slate-700 shadow-sm outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.origin);
                        onShowToast("Kopiert", "URI erfolgreich kopiert!", "success");
                      }}
                      className="h-9 px-3 bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xs"
                    >
                      Kopieren
                    </button>
                  </div>
                </div>
              </div>

              {/* GOOGLE REPLICA UI FOR AUTHORISED REDIRECT URIS */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 text-left space-y-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500"></div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    Autorisierte Weiterleitungs-URIs <span className="text-slate-400 font-normal text-xs">?</span>
                  </h4>
                  <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                    Dieses Feld kann für Anfragen über einen Webserver verwendet werden.
                  </p>
                </div>
                
                <div className="space-y-2">
                  <div className="space-y-1">
                    <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-wide">URI 1 (Für Popup-Authentifizierung) *</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={window.location.origin + "/auth/callback"}
                        className="flex-1 h-9 bg-white border border-slate-300 rounded-lg px-3 font-mono text-[11px] text-slate-700 shadow-sm outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(window.location.origin + "/auth/callback");
                          onShowToast("Kopiert", "URI erfolgreich kopiert!", "success");
                        }}
                        className="h-9 px-3 bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xs"
                      >
                        Kopieren
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-wide">URI 2 (Sicherheits-Fallback)</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        readOnly
                        value={window.location.origin + window.location.pathname}
                        className="flex-1 h-9 bg-white border-slate-300 rounded-lg px-3 font-mono text-[11px] text-slate-700 shadow-sm outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(window.location.origin + window.location.pathname);
                          onShowToast("Kopiert", "URI erfolgreich kopiert!", "success");
                        }}
                        className="h-9 px-3 bg-white hover:bg-slate-100 text-slate-600 border border-slate-300 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer shadow-xs"
                      >
                        Kopieren
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <span className="flex items-center justify-center h-5 w-5 rounded-full bg-slate-100 text-slate-705 font-bold text-[10px] mt-0.5 shrink-0">5</span>
            <p className="leading-relaxed">
              Klicke auf <strong>Erstellen</strong>, kopiere die generierte <strong>Client-ID</strong> (endet meist auf <code>.apps.googleusercontent.com</code>) und füge sie hier unten ein:
            </p>
          </div>
        </div>

        <div className="pt-5 border-t border-slate-100">
          <label className="block text-[10px] font-bold text-slate-700 mb-1.5 uppercase tracking-wide">Deine Google OAuth Client-ID</label>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={clientId}
              onChange={(e) => handleSaveClientId(e.target.value)}
              placeholder="z.B. 123456789-vsh7s9...apps.googleusercontent.com"
              className="flex-1 h-11 bg-slate-50 border border-slate-200 rounded-xl px-4 text-xs font-mono text-slate-800 focus:border-slate-600 focus:bg-white focus:outline-none transition-all"
            />
            <button 
              onClick={() => {
                handleSaveClientId(clientId);
                onShowToast("Client-ID gespeichert", "🟢 Deine Google Client-ID wurde unbestechlich lokal gesichert!", "success");
              }}
              className="h-11 px-5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs uppercase rounded-xl transition-all flex items-center gap-1.5 shadow-md active:scale-98 cursor-pointer"
            >
              Speichern
            </button>
          </div>
        </div>
      </div>

      {/* Elegantes unbestechliches Hilfe-Modal */}
      {activeHelpSection && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn"
          onClick={() => setActiveHelpSection(null)}
        >
          <div 
            className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 max-w-lg w-full max-h-[85vh] overflow-y-auto shadow-2xl space-y-6 relative animate-scaleIn text-left"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Schließen Button */}
            <button 
              type="button"
              onClick={() => setActiveHelpSection(null)}
              className="absolute top-4 right-4 h-8 w-8 text-slate-400 hover:text-slate-650 hover:bg-slate-100 rounded-xl flex items-center justify-center transition-all cursor-pointer text-lg font-bold"
            >
              ×
            </button>

            {/* Header mit passendem Icon & Sektion */}
            <div className="flex items-center gap-4 border-b border-slate-100 pb-4">
              <div className="h-12 w-12 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center text-slate-800 font-extrabold text-xl select-none">
                ?
              </div>
              <div>
                <span className="block text-[10px] font-bold text-slate-800 uppercase tracking-widest font-mono">
                  Funktions- &amp; Praxis-Guide
                </span>
                <h3 className="text-base font-bold text-slate-900">
                  {activeHelpSection === "sheets" && "1. Google Sheets Integration"}
                  {activeHelpSection === "docs" && "2. Google Docs Integration"}
                  {activeHelpSection === "offline" && "3. Offline-Sicherung & Gemini Blueprint"}
                  {activeHelpSection === "drive" && "4. Google Drive Backup-System"}
                </h3>
              </div>
            </div>

            {/* Content basierend auf Sektion */}
            <div className="space-y-4 text-xs font-semibold leading-relaxed text-slate-600">
              {activeHelpSection === "sheets" && (
                <>
                  <div>
                    <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span> Beschreibung der Funktion:
                    </h4>
                    <p className="text-slate-600 leading-relaxed font-semibold">
                      Überträgt deine tagesaktuellen Marktdaten (VIX, VXV, VVIX, SPX etc.) direkt aus dieser App in dein persönliches Google Drive Tabellenblatt. So baust du dir vollautomatisch eine Langzeit-Musterdatenbank auf.
                    </p>
                  </div>

                  <div>
                    <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span> Vorgehensweise im Detail:
                    </h4>
                    <ol className="list-decimal list-inside space-y-1.5 pl-1 font-medium text-slate-600 space-y-2">
                      <li>
                        <strong>Schritt 1 (Export-Modus wählen)</strong>: 
                        <br />
                        <span className="text-slate-500 text-[11px] pl-4 block mt-0.5 leading-normal font-semibold">
                          • <em>Neue Datei pro Tag:</em> Erstellt bei jedem Export ein separates, sauberes Dokument (z.B. <code className="font-mono text-emerald-700 bg-emerald-50 px-1 rounded text-[10px]">Morgenroutine_Journal_20260423...</code>) für maximale Trennung.
                        </span>
                        <span className="text-slate-500 text-[11px] pl-4 block mt-0.5 leading-normal font-semibold">
                          • <em>Sammeltabelle:</em> Hängt die Daten als fortlaufende neue Zeilen an ein einziges Dokument an (Sammeltabelle).
                        </span>
                      </li>
                      <li>
                        <strong>Schritt 2 (Anbindung &amp; ID-Eingabe)</strong>: Bei Verwendung des Sammeltabellen-Modus kannst du oben optional deine eigene Spreadsheet-ID eintragen. Lässt du dieses Feld leer, generiert die App im Hintergrund automatisch ein neues Zentraldokument (namens &quot;Tages_Journal&quot;) für dich und speichert dessen ID lokal.
                      </li>
                      <li>
                        <strong>Schritt 3 (Schnittstellen-Synchronisation)</strong>: Klicke auf den Button am Ende der Karte, um die Daten sicher an Google Sheets zu senden.
                      </li>
                    </ol>
                  </div>

                  <div className="pt-4 border-t border-slate-100 space-y-2">
                    <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-600"></span> Kopierbare Prompts für deinen KI-Chat:
                    </h4>
                    {renderCopyablePrompt(
                      "Journal-Daten & Vola analysieren",
                      "Kopiere diesen hilfreichen Prompt in deinen KI-Chat (z.B. Gemini), um deine Google Sheets-Zusammenfassungen und KPI-Formeln professionell planen zu lassen.",
                      "Ich verwalte meine unbestechlichen Marktdaten in einer Google Sheets Sammeltabelle mit den Spalten: Datum, VIX, VXV, Vola-Verhältnis, VVIX, SPX Kurs, WTI Öl, Erdgas, Aktienkurse und Systemstatus. Bitte erstelle mir eine professionelle Google Sheets Formel oder ein Google Apps Script, um automatisch ausreidende Vola-Phasen (Verhältnis > 1.0) farblich zu markieren und eine wöchentliche Zusammenfassung der Trendstärke zu berechnen."
                    )}
                  </div>
                </>
              )}

              {activeHelpSection === "docs" && (
                <>
                  <div>
                    <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span> Beschreibung der Funktion:
                    </h4>
                    <p className="text-slate-600 leading-relaxed font-medium">
                      Generiert dein persönliches, unbestechliches &quot;Master-Regelwerk&quot; als sauber formatiertes Google Dokument. Es enthält vordefinierte System-Regeln wie die 7 Rene-Denkfehler, deine harten Stopp-Anker sowie deine aktuellen Handelsleitsätze zur Archivierung und Anpassung.
                    </p>
                  </div>

                  <div>
                    <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-500"></span> Vorgehensweise im Detail:
                    </h4>
                    <ol className="list-decimal list-inside space-y-1.5 pl-1 font-medium text-slate-600 space-y-2">
                      <li>
                        <strong>Schritt 1 (API-Voraussetzung prüfen)</strong>: Da Docs-Exporte stark reglementiert sind, muss die <strong>Google Docs API</strong> einmalig in deinem GCP-Projekt aktiviert sein (Nutze den roten Assistenz-Link bei einem Fehler code 403).
                      </li>
                      <li>
                        <strong>Schritt 2 (Regelwerk erzeugen)</strong>: Klicke auf <strong>&quot;Regelwerk als Google Doc erstellen&quot;</strong>.
                      </li>
                      <li>
                        <strong>Schritt 3 (Ordner-Hierarchie)</strong>: Sofern du bei Google Drive (Sektion 4) einen Standard-Zielordner verknüpft hast, wird das Dokument dort automatisiert und sauber organisiert einsortiert! Ansonsten wird es direkt auf deinem Drive Root abgelegt.
                      </li>
                    </ol>
                  </div>

                  <div className="pt-4 border-t border-slate-100 space-y-2">
                    <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-600"></span> Kopierbare Prompts für deinen KI-Chat:
                    </h4>
                    {renderCopyablePrompt(
                      "Regelwerk unbestechlich schärfen",
                      "Verwende diesen Prompt, um deine Handelsdisziplin bei Marktturbulenzen strategisch durch die KI absichern zu lassen.",
                      "Ich möchte mein unbestechliches Master-Regelwerk (inklusive der 7 Rene-Denkfehler und harten Anker) erweitern. Hilf mir, für Phasen hoher Marktvolatilität (VIX > 30) konkrete, unmissverständliche Verhaltensregeln zu formulieren, um Emotions-Trades und Overtrading konsequent auszuschließen. Formatiere den Entwurf als sauberes Markdown."
                    )}
                  </div>
                </>
              )}

              {activeHelpSection === "offline" && (
                <>
                  <div>
                    <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span> Beschreibung der Funktion:
                    </h4>
                    <p className="text-slate-600 leading-relaxed font-medium">
                      Bietet dir eine völlig netzwerkunabhängige Möglichkeit, deine Routinen und Portfoliodaten lokal auf deinem Computer zu sichern (JSON-Dateien) und vorzubereiten. Zudem kopiert es einen codierten unbestechlichen Blueprint mit all deinen Depot-Zuständen für den perfekten Neustart der KI-Sitzung in Gemini.
                    </p>
                  </div>

                  <div>
                    <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span> Vorgehensweise im Detail:
                    </h4>
                    <ul className="list-disc list-inside space-y-1.5 pl-1 font-medium text-slate-600 space-y-2">
                      <li>
                        <strong>JSON herunterladen</strong>: Erzeugt instantan eine kompakte <code className="bg-slate-100 px-1 rounded text-amber-850 font-mono text-[9.5px]">.json</code> Textdatei mit allen Werten, Alarmsignalen und dem kompletten Setup. Perfekt zur lokalen Archivierung!
                      </li>
                      <li>
                        <strong>JSON hochladen</strong>: Wähle eine zuvor exportierte Datei aus, um alle Daten sofort und offline komplett im Dashboard wieder einzusteuern.
                      </li>
                      <li>
                        <strong>Blueprint kopieren</strong>: Kopiert eine exakte textuelle Momentaufnahme deines Systems. Füge diesen Text einfach zu Beginn einer neuen Gemini Web-Session ein. Das neuronale Modell erhält so ein lückenloses Bild deines Vola-Status und deiner Handelsprioritäten.
                      </li>
                    </ul>
                  </div>

                  <div className="pt-4 border-t border-slate-100 space-y-2">
                    <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-600"></span> Kopierbare Prompts für deinen KI-Chat:
                    </h4>
                    {renderCopyablePrompt(
                      "Komplett-Dossier & Risiko-Analyse",
                      "Kopiere diesen Prompt in Gemini und füge deinen frisch kopierten System-Blueprint direkt am Ende ein.",
                      "Analysiere mein folgendes unbestechliches System-Dossier. Bewerte meinen aktuellen Depotzustand, meine Risikoexponierung und die Alarmsignale basierend auf dem aktuellen VIX/VXV-Verhältnis und meinen harten Ankern. Gib mir konkrete risiko-reduzierende Handlungsempfehlungen für den heutigen Handelstag: [FÜGE HISTORISCHEN BLUEPRINT HIER EIN]"
                    )}
                  </div>
                </>
              )}

              {activeHelpSection === "drive" && (
                <>
                  <div>
                    <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-600"></span> Beschreibung der Funktion:
                    </h4>
                    <p className="text-slate-600 leading-relaxed font-medium">
                      Der unbestechliche Datenspeicher sichert komplette Backups deines Systems verschlüsselt und sicher direkt in der Google Cloud (Google Drive). So gehen deine Daten selbst bei einem Browserwechsel, einer Cookie-Löschung oder einem Systemabsturz niemals verloren.
                    </p>
                  </div>

                  <div>
                    <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-600"></span> Vorgehensweise im Detail:
                    </h4>
                    <ol className="list-decimal list-inside space-y-1.5 pl-1 font-medium text-slate-600 space-y-2">
                      <li>
                        <strong>Schritt 1 (Backup-Verzeichnis festlegen)</strong>: Trage eine Google Drive <strong>Ordner-ID</strong> oder füge einfach den kompletten Ordnerlink (URL) deines Wunsch-Ablageverzeichnisses oben ein. Die Web-App extrahiert die ID automatisch aus der Eingabe.
                      </li>
                      <li>
                        <strong>Schritt 2 (Automatisierte Ordnung)</strong>: Nutze den Button <strong>&quot;Ordner automatisch erstellen&quot;</strong>, um vollautomatisch nach einem Ordner &apos;Morgenroutine Backups&apos; in deinem Drive zu suchen oder diesen im Handumdrehen neu anzulegen.
                      </li>
                      <li>
                        <strong>Schritt 3 (Sicherheitszustand schreiben)</strong>: Klicke auf <strong>&quot;Neues Backup hochladen&quot;</strong>, um den aktuellen Zustand unveränderlich in der Backup-Mappe einzutragen.
                      </li>
                      <li>
                        <strong>Schritt 4 (Wiederherstellung)</strong>: Bei Systemfehlern klicke einfach in der Google Drive Dateiliste auf <strong>&quot;Wiederherstellen&quot;</strong>, um genau dieses Backup einzuspielen.
                      </li>
                    </ol>
                  </div>

                  <div className="pt-4 border-t border-slate-100 space-y-2">
                    <h4 className="text-[11px] font-bold text-slate-800 uppercase tracking-wide mb-1 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-600"></span> Kopierbare Prompts für deinen KI-Chat:
                    </h4>
                    {renderCopyablePrompt(
                      "Automatisierte Drive-Verzeichnispflege",
                      "Erzeuge ein automatisiertes Löschskript für alte, unbenutzte JSON-Sicherungen per Apps Script.",
                      "Erstelle mir ein Google Apps Script, das jede Woche automatisiert mein unbestechliches Backup-Verzeichnis auf Google Drive durchsucht, veraltete JSON-Zustände (älter als 30 Tage) löscht und mir eine Status-E-Mail mit der Anzahl der aktiven Backups und der letzten Update-Zeitpunkte zusendet."
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Schließen Button am Fuß des Modals */}
            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setActiveHelpSection(null)}
                className="px-5 h-9 bg-slate-900 hover:bg-slate-850 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-xs active:scale-98"
              >
                Verstanden
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
