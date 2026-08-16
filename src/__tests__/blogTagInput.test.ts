import { describe, expect, it } from 'vitest';
import { mergeTagInput } from '../services/blogTagInput';

describe('mergeTagInput', () => {
  it('returns the unchanged tags for an empty input', () => {
    const tags = ['React'];

    expect(mergeTagInput(tags, '   ')).toBe(tags);
  });

  it('appends a single trimmed tag', () => {
    expect(mergeTagInput(['React'], '  TypeScript ')).toEqual(['React', 'TypeScript']);
  });

  it('splits the input by comma and semicolon', () => {
    expect(mergeTagInput([], 'React, TypeScript; Vite')).toEqual(['React', 'TypeScript', 'Vite']);
  });

  it('ignores tags that already exist and duplicates within the input', () => {
    expect(mergeTagInput(['React'], 'React, Vite, Vite')).toEqual(['React', 'Vite']);
  });
});
