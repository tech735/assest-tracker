import { describe, expect, it } from 'vitest';
import { parseCSV, parseLooseDate, toCSV } from '@/lib/csv';
import { bookValue, coverage, displayLocation, initials } from '@/lib/assetMeta';
import { findAssetByCode } from '@/lib/scan';
import type { Asset } from '@/types/asset';

describe('parseCSV', () => {
  it('handles quoted commas, escaped quotes, CRLF and a BOM', () => {
    const rows = parseCSV(String.fromCharCode(0xfeff) + 'Name,Vendor,Notes\r\n"MacBook, 14""",Dell Inc.,"line1\nline2"\r\n\r\nX,Y,Z\n');
    expect(rows).toEqual([
      ['Name', 'Vendor', 'Notes'],
      ['MacBook, 14"', 'Dell Inc.', 'line1\nline2'],
      ['X', 'Y', 'Z'],
    ]);
  });

  it('round-trips with toCSV', () => {
    const data = [['a,b', 'c"d'], ['e', '']];
    expect(parseCSV(toCSV(data))).toEqual(data);
  });
});

describe('parseLooseDate', () => {
  it('reads ISO and day-first formats', () => {
    expect(parseLooseDate('2026-10-18')).toBe('2026-10-18');
    expect(parseLooseDate('18/10/2026')).toBe('2026-10-18');
    expect(parseLooseDate('8-3-26')).toBe('2026-03-08');
    expect(parseLooseDate('18.10.2026')).toBe('2026-10-18');
  });
  it('rejects impossible dates and blanks', () => {
    expect(parseLooseDate('31/13/2026')).toBeNull();
    expect(parseLooseDate('')).toBeNull();
  });
});

describe('findAssetByCode', () => {
  const assets = [
    { id: '11111111-1111-4111-8111-111111111111', assetTag: 'AST-1042', serialNumber: 'C02FX3LZQ05N' },
    { id: '22222222-2222-4222-8222-222222222222', assetTag: 'AST-1043', serialNumber: '5CG2341XYZ' },
  ] as Asset[];
  it('matches tags and serials case-insensitively', () => {
    expect(findAssetByCode(assets, 'ast-1042')?.id).toBe(assets[0].id);
    expect(findAssetByCode(assets, ' 5cg2341xyz ')?.id).toBe(assets[1].id);
  });
  it('matches the QR label URL', () => {
    expect(findAssetByCode(assets, 'https://assets.kotu.co.in/assets/22222222-2222-4222-8222-222222222222')?.assetTag).toBe('AST-1043');
  });
  it('returns undefined for unknown codes', () => {
    expect(findAssetByCode(assets, 'NOPE')).toBeUndefined();
  });
});

describe('asset maths', () => {
  const iso = (days: number) => new Date(Date.now() + days * 864e5).toISOString().slice(0, 10);
  it('coverage flags expiring and expired windows', () => {
    expect(coverage(iso(-300), iso(5))?.tone).toBe('destructive');
    expect(coverage(iso(-300), iso(20))?.tone).toBe('warning');
    expect(coverage(iso(-100), iso(200))?.tone).toBe('success');
    expect(coverage(iso(-400), iso(-10))?.label).toMatch(/Expired 10 days ago/);
    expect(coverage(undefined, undefined)).toBeNull();
  });
  it('book value depreciates straight-line over 3 years and never goes negative', () => {
    expect(bookValue({ purchaseCost: 300, purchaseDate: iso(0) })?.value).toBeCloseTo(300, 0);
    expect(Math.round(bookValue({ purchaseCost: 300, purchaseDate: iso(-365) })!.value)).toBe(200);
    expect(bookValue({ purchaseCost: 300, purchaseDate: iso(-2000) })?.value).toBe(0);
    expect(bookValue({ purchaseCost: undefined, purchaseDate: iso(0) })).toBeNull();
  });
  it('display helpers', () => {
    expect(displayLocation('Warehouse')).toBe('Central Warehouse');
    expect(initials('Ananya Kapoor')).toBe('AK');
  });
});
