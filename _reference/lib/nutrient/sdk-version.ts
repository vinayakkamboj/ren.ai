export const NUTRIENT_WEB_SDK_PACKAGE = "@nutrient-sdk/viewer";
export const NUTRIENT_WEB_SDK_VERSION = "1.15.0";
export const NUTRIENT_WEB_SDK_DEPENDENCY = `^${NUTRIENT_WEB_SDK_VERSION}`;

// Official Nutrient CDN. Loading the prebuilt nutrient-viewer.js from here runs
// the SDK natively in the browser (no bundler touches it), which avoids the
// "_Symbol$iterator is not defined" failures seen when a bundler (Next/SWC or
// Sandpack's in-browser transpiler) tries to re-transpile the minified package.
export const NUTRIENT_CDN_BASE_URL = `https://cdn.cloud.pspdfkit.com/pspdfkit-web@${NUTRIENT_WEB_SDK_VERSION}/`;
export const NUTRIENT_CDN_SCRIPT_URL = `${NUTRIENT_CDN_BASE_URL}nutrient-viewer.js`;

export const NUTRIENT_WEB_DEMO_DOCUMENT_URL =
  "https://www.nutrient.io/downloads/nutrient-web-demo.pdf";
