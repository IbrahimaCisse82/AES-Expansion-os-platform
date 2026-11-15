import { describe, it, expect } from 'vitest';
import { buildTags, channelOf, extractHashtags } from './chatTags';

describe('tags de discussion', () => {
  it('extrait les hashtags (accents, sans doublon, pas les ancres d’URL)', () => {
    expect(extractHashtags('Relance #Clinique et #clinique, voir #trésorerie — http://x.y/#ancre')).toEqual(['clinique', 'trésorerie']);
  });
  it('le canal vient en premier', () => {
    expect(buildTags('Finance', 'point #finance #relance')).toEqual(['Finance', 'relance']);
    expect(channelOf(['relance', 'Reporting'])).toBe('Reporting');
    expect(channelOf([])).toBe('Général');
  });
});

import { discussionLink, objectTag } from './chatTags';
describe('discussion d’un objet', () => {
  it('tag stable et lien prérempli', () => {
    expect(objectTag('A2-2026-10')).toBe('a2-2026-10');
    expect(objectTag('DEV 2026/0003')).toBe('dev-2026-0003');
    expect(extractHashtags(`#${objectTag('A1-2026-W43')} ok`)).toEqual(['a1-2026-w43']);
    const u = new URL(`http://x${discussionLink('Reporting', 'a2-2026-10')}`);
    expect(u.pathname).toBe('/app/comments');
    expect(u.searchParams.get('canal')).toBe('Reporting');
    expect(u.searchParams.get('texte')).toBe('#a2-2026-10 ');
  });
});
