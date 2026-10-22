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
