import { describe, it, expect, vi } from 'vitest';
import { fetchAllRows, PAGE_SIZE } from './fetchAll';

const table = (n: number) => Array.from({ length: n }, (_, i) => ({ id: i }));

describe('fetchAllRows', () => {
  it('récupère toutes les lignes au-delà de la limite de 1 000', async () => {
    const data = table(2500);
    const page = vi.fn(async (from: number, to: number) => ({ data: data.slice(from, to + 1), error: null }));
    const rows = await fetchAllRows(page);
    expect(rows).toHaveLength(2500);
    expect(page).toHaveBeenCalledTimes(3);
    expect(page).toHaveBeenNthCalledWith(2, PAGE_SIZE, 2 * PAGE_SIZE - 1);
  });

  it('fait une seule requête quand tout tient dans une page', async () => {
    const page = vi.fn(async () => ({ data: table(10), error: null }));
    expect(await fetchAllRows(page)).toHaveLength(10);
    expect(page).toHaveBeenCalledTimes(1);
  });

  it('gère une page pleine suivie d’une page vide', async () => {
    const data = table(PAGE_SIZE);
    const page = vi.fn(async (from: number, to: number) => ({ data: data.slice(from, to + 1), error: null }));
    expect(await fetchAllRows(page)).toHaveLength(PAGE_SIZE);
    expect(page).toHaveBeenCalledTimes(2);
  });

  it('propage les erreurs', async () => {
    const err = new Error('boom');
    await expect(fetchAllRows(async () => ({ data: null, error: err }))).rejects.toBe(err);
  });
});
