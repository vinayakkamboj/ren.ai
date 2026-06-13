import { NUTRIENT_CDN_SCRIPT_URL } from "./sdk-version";

export type NutrientToolbarItem = {
  type: string;
  id?: string;
  title?: string;
  icon?: string;
  className?: string;
  dropdownGroup?: string;
  responsiveGroup?: string;
  mediaQueries?: string[];
  disabled?: boolean;
  selected?: boolean;
  onPress?: (event: Event, id?: string) => void;
  [key: string]: unknown;
};

export type NutrientViewerModule = {
  load: (options: Record<string, unknown>) => Promise<object>;
  unload: (target: HTMLElement | string | object | null) => boolean;
  Theme: { DARK: string; LIGHT: string };
  ViewState: new (settings: Record<string, unknown>) => object;
  ZoomMode: { FIT_TO_WIDTH: string };
  SidebarMode: { THUMBNAILS: string };
  defaultToolbarItems?: NutrientToolbarItem[];
};

type WindowWithNutrient = Window & { NutrientViewer?: NutrientViewerModule };

let loaderPromise: Promise<NutrientViewerModule> | null = null;

// Loads the prebuilt SDK from Nutrient's CDN via a <script> tag and resolves
// window.NutrientViewer. This is the robust path that avoids bundler transpile
// errors (e.g. "_Symbol$iterator is not defined").
export function loadNutrientFromCDN(): Promise<NutrientViewerModule> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Nutrient SDK can only load in the browser"));
  }

  const w = window as WindowWithNutrient;
  if (w.NutrientViewer) return Promise.resolve(w.NutrientViewer);

  loaderPromise ??= new Promise<NutrientViewerModule>((resolve, reject) => {
    const finish = () => {
      const NV = (window as WindowWithNutrient).NutrientViewer;
      if (NV) resolve(NV);
      else reject(new Error("Nutrient SDK script loaded but window.NutrientViewer is undefined"));
    };

    const existing = document.querySelector<HTMLScriptElement>(
      `script[data-nutrient-cdn="true"]`
    );
    if (existing) {
      if ((window as WindowWithNutrient).NutrientViewer) return finish();
      existing.addEventListener("load", finish);
      existing.addEventListener("error", () => {
        loaderPromise = null;
        reject(new Error("Failed to load Nutrient Web SDK from CDN"));
      });
      return;
    }

    const script = document.createElement("script");
    script.src = NUTRIENT_CDN_SCRIPT_URL;
    script.async = true;
    script.dataset.nutrientCdn = "true";
    script.onload = finish;
    script.onerror = () => {
      loaderPromise = null;
      script.remove();
      reject(new Error("Failed to load Nutrient Web SDK from CDN"));
    };
    document.head.appendChild(script);
  });

  return loaderPromise;
}
