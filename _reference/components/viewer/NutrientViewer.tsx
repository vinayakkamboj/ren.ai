"use client";

import { useEffect, useRef, useState } from "react";
import { AlertTriangle, KeyRound, RefreshCw, X } from "lucide-react";
import { useWorkspaceStore } from "@/features/workspaces/store";
import { buildToolbarItems, getDocumentUrl } from "@/lib/nutrient/config";
import { loadNutrientFromCDN, type NutrientToolbarItem, type NutrientViewerModule } from "@/lib/nutrient/cdn-loader";
import { NUTRIENT_CDN_BASE_URL } from "@/lib/nutrient/sdk-version";

interface NutrientViewerProps {
  viewerKey: number;
}

// Module-level cache so the cleanup function can call unload() SYNCHRONOUSLY.
// The cleanup must be synchronous because React fires the next effect immediately
// after cleanup returns - if unload is async, the new load() races it and gets
// "Configuration#container is already used" error.
let _NutrientViewer: NutrientViewerModule | null = null;

const LICENSE_MODE_STORAGE_KEY = "nutrient.viewer.licenseMode";
const LICENSE_KEY_STORAGE_KEY = "nutrient.viewer.licenseKey";

type LicenseMode = "demo" | "custom";

function unloadViewer(NutrientViewer: NutrientViewerModule, target: HTMLElement | object | null) {
  try {
    NutrientViewer.unload(target);
  } catch {
    // unload() is a cleanup best-effort. The SDK may throw for an invalid target,
    // but it is safe to continue when there is no mounted instance.
  }
}

function readStoredLicense() {
  if (typeof window === "undefined") {
    return { mode: "demo" as LicenseMode, key: "" };
  }

  const mode = window.localStorage.getItem(LICENSE_MODE_STORAGE_KEY);
  const key = window.localStorage.getItem(LICENSE_KEY_STORAGE_KEY) ?? "";

  return {
    mode: mode === "custom" && key.trim() ? "custom" as LicenseMode : "demo" as LicenseMode,
    key,
  };
}

function persistLicense(mode: LicenseMode, key: string) {
  window.localStorage.setItem(LICENSE_MODE_STORAGE_KEY, mode);
  if (key.trim()) {
    window.localStorage.setItem(LICENSE_KEY_STORAGE_KEY, key.trim());
  } else {
    window.localStorage.removeItem(LICENSE_KEY_STORAGE_KEY);
  }
}

function isLicenseLoadError(message: string): boolean {
  const normalized = message.toLowerCase();
  return normalized.includes("license key") || normalized.includes("licensekey");
}

export function preloadNutrientViewer(): Promise<NutrientViewerModule> {
  if (_NutrientViewer) return Promise.resolve(_NutrientViewer);

  return loadNutrientFromCDN().then((module) => {
    _NutrientViewer = module;
    return module;
  });
}

export function NutrientViewer({ viewerKey }: NutrientViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<object | null>(null);
  const loadIdRef = useRef(0);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [licenseMode, setLicenseMode] = useState<LicenseMode>("demo");
  const [customLicenseKey, setCustomLicenseKey] = useState("");
  const [licenseDialogOpen, setLicenseDialogOpen] = useState(false);
  const [draftLicenseKey, setDraftLicenseKey] = useState("");

  const config = useWorkspaceStore((s) => s.config);
  const setViewerLoading = useWorkspaceStore((s) => s.setViewerLoading);

  const configRef = useRef(config);
  configRef.current = config;
  const setViewerLoadingRef = useRef(setViewerLoading);
  setViewerLoadingRef.current = setViewerLoading;

  useEffect(() => {
    const stored = readStoredLicense();
    setLicenseMode(stored.mode);
    setCustomLicenseKey(stored.key);
    setDraftLicenseKey(stored.key);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const cfg = configRef.current;
    if (!container || !cfg) return;

    const loadId = ++loadIdRef.current;

    // Synchronously unload anything already bound to this container using the
    // cached module. Calling unload(container) also cancels an in-flight load.
    if (_NutrientViewer) {
      unloadViewer(_NutrientViewer, instanceRef.current);
      unloadViewer(_NutrientViewer, container);
      instanceRef.current = null;
    }

    let cancelled = false;
    setError(null);
    setIsLoading(true);
    setViewerLoadingRef.current(true);

    async function load() {
      try {
        // Dynamic import is cached after the first call - subsequent calls are
        // effectively synchronous and return the same module object.
        const NutrientViewer = await preloadNutrientViewer();

        if (cancelled || loadIdRef.current !== loadId) return;

        // Second guard: if another effect snuck in while we were awaiting import,
        // clear the container before starting a fresh load.
        unloadViewer(NutrientViewer, instanceRef.current);
        unloadViewer(NutrientViewer, container!);
        instanceRef.current = null;

        if (cancelled || loadIdRef.current !== loadId) return;

        const documentUrl = getDocumentUrl(cfg!.activeSampleDocumentId ?? "", cfg!);
        const toolbarItems = buildToolbarItems(cfg!, NutrientViewer.defaultToolbarItems as NutrientToolbarItem[]);
        const licenseKey = licenseMode === "custom" ? customLicenseKey.trim() : "";

        const loadOptions: Record<string, unknown> = {
          container: container!,
          document: documentUrl,
          baseUrl: NUTRIENT_CDN_BASE_URL,
          theme: cfg!.theme.mode === "dark" ? NutrientViewer.Theme.DARK : NutrientViewer.Theme.LIGHT,
          toolbarItems,
          initialViewState: new NutrientViewer.ViewState({
            currentPageIndex: 0,
            showToolbar: true,
            zoom: NutrientViewer.ZoomMode.FIT_TO_WIDTH,
            sidebarMode: cfg!.toolbar.showThumbnails ? NutrientViewer.SidebarMode.THUMBNAILS : null,
          }),
        };

        // No licenseKey means demo/evaluation mode. This keeps the viewer usable
        // even when a deployed environment has an invalid public license value.
        if (licenseKey) loadOptions.licenseKey = licenseKey;

        const instance = await NutrientViewer.load(loadOptions);

        if (cancelled || loadIdRef.current !== loadId) {
          unloadViewer(NutrientViewer, instance);
          unloadViewer(NutrientViewer, container!);
          return;
        }

        instanceRef.current = instance;
      } catch (err) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("[NutrientViewer] load error:", msg);

          if (licenseMode === "custom" && isLicenseLoadError(msg)) {
            console.warn("[NutrientViewer] Invalid license key. Falling back to demo mode.");
            useDemoMode();
            return;
          }

          setError(msg);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
          setViewerLoadingRef.current(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
      if (loadIdRef.current === loadId) loadIdRef.current += 1;
      // Synchronous unload - _NutrientViewer is already populated from the load() call above
      // (or from a previous render). No async import needed here.
      if (container && _NutrientViewer) {
        unloadViewer(_NutrientViewer, instanceRef.current);
        unloadViewer(_NutrientViewer, container);
        instanceRef.current = null;
      }
    };
  }, [viewerKey, licenseMode, customLicenseKey]);

  function useDemoMode() {
    persistLicense("demo", "");
    setLicenseMode("demo");
    setCustomLicenseKey("");
    setDraftLicenseKey("");
    setLicenseDialogOpen(false);
    setError(null);
  }

  function saveLicenseKey() {
    const key = draftLicenseKey.trim();
    if (!key) {
      useDemoMode();
      return;
    }

    persistLicense("custom", key);
    setLicenseMode("custom");
    setCustomLicenseKey(key);
    setLicenseDialogOpen(false);
    setError(null);
  }

  if (error) {
    return (
      <div className="relative h-full w-full flex flex-col items-center justify-center gap-3 bg-[#1a1414] text-center px-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10">
          <AlertTriangle className="h-5 w-5 text-red-400" />
        </div>
        <div>
          <p className="text-sm font-medium text-zinc-300 mb-1">Viewer failed to load</p>
          <p className="text-xs text-zinc-600 max-w-sm font-mono leading-relaxed">{error}</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            onClick={useDemoMode}
            className="flex items-center gap-1.5 text-xs text-zinc-950 bg-zinc-200 hover:bg-white rounded-md px-3 py-1.5 transition-colors"
          >
            Use demo mode
          </button>
          <button
            onClick={() => {
              setDraftLicenseKey(customLicenseKey);
              setLicenseDialogOpen(true);
            }}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 border border-[#222] hover:border-[#333] rounded-md px-3 py-1.5 transition-colors"
          >
            <KeyRound className="h-3 w-3" />
            Set license key
          </button>
          <button
            onClick={() => {
              setError(null);
              useWorkspaceStore.getState().refreshViewer();
            }}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 border border-[#222] hover:border-[#333] rounded-md px-3 py-1.5 transition-colors"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </button>
        </div>
        {licenseDialogOpen && (
          <LicenseDialog
            value={draftLicenseKey}
            onChange={setDraftLicenseKey}
            onClose={() => setLicenseDialogOpen(false)}
            onSave={saveLicenseKey}
            onDemo={useDemoMode}
          />
        )}
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-[#1a1414] flex flex-col">
      <div ref={containerRef} className="relative min-h-0 flex-1 w-full" />
      {isLoading && (
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center pt-3">
          <div className="rounded-full border border-[#332b2b] bg-[#1a1414]/85 px-3 py-1 text-[11px] text-zinc-400 shadow-lg backdrop-blur">
            Loading Nutrient viewer...
          </div>
        </div>
      )}
      <div className="flex h-9 shrink-0 items-center justify-between gap-3 border-t border-[#242020] bg-[#1a1414] px-3">
        <div className="min-w-0 text-[11px] text-zinc-500">
          {licenseMode === "custom" ? "Licensed with browser key" : "Demo mode"}
        </div>
        <div className="flex items-center gap-2">
          {licenseMode === "custom" && (
            <button
              onClick={useDemoMode}
              className="text-[11px] text-zinc-600 hover:text-zinc-300 transition-colors"
            >
              Use demo mode
            </button>
          )}
          <button
            onClick={() => {
              setDraftLicenseKey(customLicenseKey);
              setLicenseDialogOpen(true);
            }}
            className="flex items-center gap-1.5 text-[11px] text-zinc-500 hover:text-zinc-200 transition-colors"
          >
            <KeyRound className="h-3 w-3" />
            Set license key
          </button>
        </div>
      </div>
      {licenseDialogOpen && (
        <LicenseDialog
          value={draftLicenseKey}
          onChange={setDraftLicenseKey}
          onClose={() => setLicenseDialogOpen(false)}
          onSave={saveLicenseKey}
          onDemo={useDemoMode}
        />
      )}
    </div>
  );
}

function LicenseDialog({
  value,
  onChange,
  onClose,
  onSave,
  onDemo,
}: {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  onSave: () => void;
  onDemo: () => void;
}) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-lg border border-[#2a2424] bg-[#1a1414] p-4 text-left shadow-2xl">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-medium text-zinc-100">Set Nutrient license key</p>
            <p className="mt-1 text-xs leading-relaxed text-zinc-500">
              Saved only in this browser. Leave empty to use demo mode.
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-600 hover:bg-white/5 hover:text-zinc-300"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Paste Nutrient Web SDK license key"
          className="min-h-24 w-full resize-none rounded-md border border-[#2a2424] bg-[#100d0d] px-3 py-2 font-mono text-xs text-zinc-200 outline-none placeholder:text-zinc-700 focus:border-zinc-500"
        />
        <div className="mt-3 flex flex-wrap justify-end gap-2">
          <button
            onClick={onDemo}
            className="rounded-md border border-[#2a2424] px-3 py-1.5 text-xs text-zinc-500 transition-colors hover:border-[#3a3333] hover:text-zinc-300"
          >
            Use demo mode
          </button>
          <button
            onClick={onSave}
            className="rounded-md bg-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-950 transition-colors hover:bg-white"
          >
            Save key
          </button>
        </div>
      </div>
    </div>
  );
}
