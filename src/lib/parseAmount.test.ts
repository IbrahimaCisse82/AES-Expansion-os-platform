import { describe, it, expect } from 'vitest';
import { parseAmount } from './parseAmount';

describe('parseAmount', () => {
  it.each([
    ['284K€', 284_000],
    ['2.0M€', 2_000_000],
    ['1,8 M€', 1_800_000],
    ['900K€', 900_000],
    ['4,940 Mds$', 4_940_000_000],
    ['1 060 Mds$', 1_060_000_000_000],
    ['1,240', 1240],
    ['1 240', 1240],
    ['1 240', 1240],
    ['1,240,000', 1_240_000],
    ['1.234,56', 1234.56],
    ['1,234.56', 1234.56],
    ['89%', 89],
    ['72', 72],
    ['12,5', 12.5],
    ['125M', 125_000_000],
    [42, 42],
  ])('%s -> %d', (raw, expected) => {
    expect(parseAmount(raw)).toBeCloseTo(expected as number, 6);
  });

  it.each([null, undefined, '', 'N/A', '-', 'inconnu'])('%s -> null', (raw) => {
    expect(parseAmount(raw as string)).toBeNull();
  });
});
