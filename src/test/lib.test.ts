import { describe, expect, it } from 'vitest';
import { csvCell, parseCSV, parseLooseDate, toCSV } from '@/lib/csv';
import { bookValue, coverage, displayLocation, initials } from '@/lib/assetMeta';
import { findAssetByCode } from '@/lib/scan';
import { chunk, fetchAllPages, mapLimit } from '@/lib/paging';
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

describe('paging', () => {
  // Fake server holding `total` rows that returns at most `cap` per request, like PostgREST max-rows.
  const server = (total: number, cap: number, withCount = true) => {
    const rows = Array.from({ length: total }, (_, i) => i);
    const requests: [number, number][] = [];
    const page = async (from: number, to: number, count: boolean) => {
      requests.push([from, to]);
      return { data: rows.slice(from, Math.min(to + 1, from + cap)), error: null, count: count && withCount ? total : null };
    };
    return { page, requests };
  };

  it('fetches every row past the 1000-row cap', async () => {
    const s = server(6000, 1000);
    const rows = await fetchAllPages(s.page);
    expect(rows).toHaveLength(6000);
    expect(new Set(rows).size).toBe(6000);
    expect(s.requests).toHaveLength(6);
  });
  it('follows a server cap smaller than the requested page', async () => {
    const rows = await fetchAllPages(server(2300, 500).page);
    expect(rows).toEqual(Array.from({ length: 2300 }, (_, i) => i));
  });
  it('walks pages when no count comes back', async () => {
    expect(await fetchAllPages(server(2500, 1000, false).page)).toHaveLength(2500);
    expect(await fetchAllPages(server(0, 1000, false).page)).toEqual([]);
  });
  it('throws the first error', async () => {
    await expect(fetchAllPages(async () => ({ data: null, error: new Error('boom') }))).rejects.toThrow('boom');
  });
  it('chunk and mapLimit keep order and bound concurrency', async () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    let inFlight = 0;
    let peak = 0;
    const out = await mapLimit([1, 2, 3, 4, 5, 6, 7], 3, async (n) => {
      peak = Math.max(peak, ++inFlight);
      await new Promise((r) => setTimeout(r, 5));
      inFlight--;
      return n * 2;
    });
    expect(out).toEqual([2, 4, 6, 8, 10, 12, 14]);
    expect(peak).toBe(3);
  });
});

describe('csvCell (formula injection)', () => {
  it('neutralises cells a spreadsheet would run as formulas', () => {
    expect(csvCell('=HYPERLINK("https://evil","x")')).toBe(`"'=HYPERLINK(""https://evil"",""x"")"`);
    expect(csvCell('+cmd')).toBe(`"'+cmd"`);
    expect(csvCell('@SUM(A1)')).toBe(`"'@SUM(A1)"`);
    expect(csvCell('	x')).toBe(`"'	x"`);
  });
  it('leaves ordinary values and numbers alone', () => {
    expect(csvCell('MacBook Pro')).toBe('"MacBook Pro"');
    expect(csvCell(-1250)).toBe('"-1250"');
    expect(csvCell('-3.5')).toBe('"-3.5"');
    expect(csvCell(null)).toBe('""');
  });
});
