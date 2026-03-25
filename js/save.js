const STORAGE_KEY = 'stockholm_saved_events';

export function getSavedIds() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [];
  } catch {
    return [];
  }
}

export function isSaved(id) {
  return getSavedIds().includes(id);
}

export function toggleSave(id) {
  const saved = getSavedIds();
  const updated = saved.includes(id)
    ? saved.filter(s => s !== id)
    : [...saved, id];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated.includes(id);
}

export function initSavedUI() {
  // Restore heart state on all rendered cards
  getSavedIds().forEach(id => {
    const btn = document.querySelector(`[data-event-id="${id}"] .heart-btn`);
    if (btn) applyHeartState(btn, true);
  });
  updateSavedCount();
}

export function applyHeartState(btn, saved) {
  btn.classList.toggle('saved', saved);
  btn.querySelector('.heart-label').textContent = saved ? 'Sparat' : 'Spara';
}

export function updateSavedCount() {
  const count = getSavedIds().length;
  const el = document.getElementById('savedCount');
  if (!el) return;
  el.querySelector('span').textContent =
    count === 0 ? 'Inga sparade' : `${count} spara${count === 1 ? 't' : 'de'}`;
}
