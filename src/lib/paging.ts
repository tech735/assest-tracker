// Supabase (PostgREST) caps every response at its "max rows" setting (1000 by default), so a plain
// select silently drops everything past the first page. These helpers fetch whole tables in pages
// and keep bulk writes to a sane request size.

type Page<T> = { data: T[] | null; error: unknown; count?: number | null };

/**
 * Fetch every row of a query. `page(from, to, withCount)` must return a fresh query with
 * `.range(from, to)` applied (and `{ count: 'exact' }` on the select when `withCount` is true),
 * ordered by a unique key so pages don't overlap.
 */
export async function fetchAllPages<T>(page: (from: number, to: number, withCount: boolean) => PromiseLike<Page<T>>, pageSize = 1000): Promise<T[]> {
  const first = await page(0, pageSize - 1, true);
  if (first.error) throw first.error;
  const rows = [...(first.data ?? [])];
  // The server may cap below what we asked for; its real page size is whatever came back.
  const step = rows.length;
  if (step === 0) return rows;

  if (typeof first.count === 'number') {
    const starts: number[] = [];
    for (let from = step; from < first.count; from += step) starts.push(from);
    const pages = await mapLimit(starts, 4, (from) => Promise.resolve(page(from, from + step - 1, false)));
    for (const p of pages) {
      if (p.error) throw p.error;
      rows.push(...(p.data ?? []));
    }
    return rows;
  }

  for (let from = step; ; from += step) {
    const p = await page(from, from + step - 1, false);
    if (p.error) throw p.error;
    if (!p.data?.length) return rows;
    rows.push(...p.data);
    if (p.data.length < step) return rows;
  }
}

export function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

/** Like Promise.all(items.map(fn)) but with at most `limit` calls in flight. */
export async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
