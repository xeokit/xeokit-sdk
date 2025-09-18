export * from "./extras/index.js";
export * from "./plugins/index.js";
export * from "./viewer/index.js";
import { VERSION } from "./constants.js";

if (typeof window !== 'undefined') {
  if (window.__XEOKIT__) {
    console.warn("WARNING: Multiple instances of xeokit-sdk being imported.");
  } else {
    window.__XEOKIT__ = VERSION || 'unknown';
  }
}