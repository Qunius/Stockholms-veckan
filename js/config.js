// js/config.js
// These are PUBLIC values only — no secrets here.
// Guard against Node/Jest environments where `document` does not exist.
function getMeta(name) {
  if (typeof document === 'undefined') return '';
  return document.querySelector(`meta[name="${name}"]`)?.content ?? '';
}
export const SANITY_PROJECT_ID   = getMeta('sanity-project-id');
export const SANITY_DATASET      = 'production';
export const SANITY_PUBLIC_TOKEN = getMeta('sanity-public-token');
