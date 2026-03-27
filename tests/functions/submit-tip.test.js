import { describe, test, expect } from '@jest/globals';
import { validateTipBody } from '../../netlify/functions/submit-tip.js';

describe('validateTipBody', () => {
  test('returns error if title missing', () => {
    const result = validateTipBody({ name: 'Anna', category: 'musik', date: '2026-03-25', address: 'Stockholm' });
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/titel/i);
  });

  test('returns error if date missing', () => {
    const result = validateTipBody({ name: 'Anna', title: 'Test', category: 'musik', address: 'Stockholm' });
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/datum/i);
  });

  test('returns error if address missing', () => {
    const result = validateTipBody({ name: 'Anna', title: 'Test', category: 'musik', date: '2026-03-25' });
    expect(result.valid).toBe(false);
    expect(result.error).toMatch(/adress/i);
  });

  test('returns valid for complete body', () => {
    const result = validateTipBody({ name: 'Anna', title: 'Pop-up', category: 'pop-up', date: '2026-03-28', address: 'Hornstull' });
    expect(result.valid).toBe(true);
  });
});
