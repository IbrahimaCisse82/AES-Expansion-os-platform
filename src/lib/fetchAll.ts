// PostgREST (Supabase) renvoie au plus 1 000 lignes par requête par défaut,
// SANS erreur : au-delà, listes et tableaux de bord étaient silencieusement
// tronqués. fetchAllRows parcourt les pages jusqu'à la dernière.

export const PAGE_SIZE = 1000;
/** Garde-fou contre une boucle infinie (100 000 lignes). */
const MAX_PAGES = 100;

type PageResult<T> = PromiseLike<{ data: T[] | null; error: unknown }>;

/**
 * @param page construit la requête pour l'intervalle [from, to] — elle doit
 *             avoir un ordre total (ajouter `.order('id')` en dernier critère)
 *             pour que la pagination soit stable.
 */
export async function fetchAllRows<T>(page: (from: number, to: number) => PageResult<T>): Promise<T[]> {
  const rows: T[] = [];
  for (let i = 0; i < MAX_PAGES; i++) {
    const from = i * PAGE_SIZE;
    const { data, error } = await page(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    const batch = data ?? [];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) return rows;
  }
  throw new Error(`fetchAllRows : plus de ${MAX_PAGES * PAGE_SIZE} lignes, filtrez la requête`);
}
