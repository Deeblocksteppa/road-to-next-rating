/**
 * Every row of a query, past PostgREST's 1000-row cap on a single response.
 * `build` returns a fresh query each call and must have a stable `order`, or
 * rows can repeat or go missing between pages.
 */
const PAGE_SIZE = 1000;

export async function allRows<T>(
  build: () => {
    range(
      from: number,
      to: number
    ): PromiseLike<{ data: unknown; error: { code?: string; message: string } | null }>;
  }
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await build().range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const page = (data ?? []) as T[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
}

/** Splits ids so an `in` filter stays inside the URL length limit. */
export function inBatches<T>(items: T[], size = 200): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) batches.push(items.slice(i, i + size));
  return batches;
}
