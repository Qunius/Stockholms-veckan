// js/filters.js
export function initFilters() {
  const tabs = document.querySelectorAll('.filter-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const filter = tab.dataset.filter;
      applyFilter(filter);
    });
  });
}

export function applyFilter(category) {
  const items = document.querySelectorAll('.event-item');
  let visible = 0;
  items.forEach(item => {
    const show = category === 'allt' || item.dataset.category === category;
    item.hidden = !show;
    if (show) visible++;
  });
  const emptyState = document.getElementById('emptyState');
  if (emptyState) emptyState.hidden = visible > 0;
}
