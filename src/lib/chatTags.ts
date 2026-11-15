// Canaux de discussion des trois environnements AES + hashtags libres (#relance, #stock…).
export const CHANNELS = ['Général', 'Finance', 'Technico-commercial', 'Reporting', 'Direction'] as const;
export type Channel = (typeof CHANNELS)[number];

/** Hashtags d'un message : lettres (accents compris), chiffres, tirets ; sans doublon, en minuscules. */
export function extractHashtags(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(/(?:^|[\s(])#([\p{L}\p{N}][\p{L}\p{N}_-]{1,40})/gu)) {
    const tag = m[1].toLowerCase();
    if (!out.includes(tag)) out.push(tag);
  }
  return out;
}

/** Tags stockés : le canal en premier, puis les hashtags qui ne le répètent pas. */
export function buildTags(channel: string, text: string): string[] {
  const ch = channel || 'Général';
  return [ch, ...extractHashtags(text).filter(t => t !== ch.toLowerCase())];
}

export const channelOf = (tags: string[] | null | undefined): string =>
  (tags ?? []).find(t => (CHANNELS as readonly string[]).includes(t)) ?? 'Général';

/** Tag de discussion d'un objet métier : « a2-2026-10 » pour un rapport, « dev-2026-0003 » pour un devis. */
export const objectTag = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N}_-]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 40);

/** Lien vers la discussion d'un objet, dans le bon canal, message prérempli avec son tag. */
export function discussionLink(channel: string, tag: string, prefill = '') {
  const p = new URLSearchParams({ canal: channel, tag, texte: `#${tag} ${prefill}`.trim() + ' ' });
  return `/app/comments?${p.toString()}`;
}

export const ENV_CHANNEL: Record<string, string> = { expansion: 'Général', tc: 'Technico-commercial', finance: 'Finance', reporting: 'Reporting' };
