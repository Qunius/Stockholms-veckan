import { getSavedIds, toggleSave, isSaved } from '../js/save.js';

beforeEach(() => {
  // Simulate localStorage
  global.localStorage = (() => {
    let store = {};
    return {
      getItem: k => store[k] ?? null,
      setItem: (k, v) => { store[k] = v; },
      clear: () => { store = {}; },
    };
  })();
});

test('getSavedIds returns empty array when nothing saved', () => {
  expect(getSavedIds()).toEqual([]);
});

test('toggleSave adds id when not saved', () => {
  toggleSave('evt-1');
  expect(getSavedIds()).toContain('evt-1');
});

test('toggleSave removes id when already saved', () => {
  toggleSave('evt-1');
  toggleSave('evt-1');
  expect(getSavedIds()).not.toContain('evt-1');
});

test('isSaved returns true for saved id', () => {
  toggleSave('evt-2');
  expect(isSaved('evt-2')).toBe(true);
});

test('isSaved returns false for unsaved id', () => {
  expect(isSaved('evt-999')).toBe(false);
});
