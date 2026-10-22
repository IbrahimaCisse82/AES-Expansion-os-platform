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
