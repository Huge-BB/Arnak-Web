// Data copied from the existing TTS implementation for migration/reference only.
// Web rules should use semantic IDs and must not depend on TTS GUIDs or world coordinates.

export const TTS_STARTER_DECK_IDS = {
  Yellow: ['0001', '0002', '0003', '0004'],
  Green: ['0005', '0006', '0007', '0008'],
  Blue: ['0009', '0010', '0011', '0012'],
  Red: ['0013', '0014', '0015', '0016'],
  Falconer: ['1001', '1002', '1003', '1004'],
  Explorer: ['1005', '1006', '1007', '1008'],
  Professor: ['1009', '1010', '1011', '1012'],
  Mystic: ['1013', '1014', '1015', '1016'],
  Baroness: ['1017', '1018', '1019', '1020'],
  Captain: ['1021', '1022', '1023', '1024'],
  Mechanic: ['2001', '2002', '2003', '2004'],
  Journalist: ['2005', '2006', '2007', '2008'],
} as const;

export const TTS_RESOURCE_CODES = {
  t: 'tablet',
  a: 'arrowhead',
  j: 'jewel',
  c: 'coin',
  s: 'compass',
  q: 'dark-tablet',
} as const;

export const TTS_PLAYER_MAT_STATES = {
  1: 'Captain',
  2: 'Falconer',
  3: 'Baroness',
  4: 'Professor',
  5: 'Explorer',
  6: 'Mystic',
  7: 'Journalist',
  8: 'Mechanic',
  9: 'Base',
} as const;

export const SUPPORTED_TTS_MODULES = [
  'expeditionLeaders',
  'missingExpedition',
  'twistedPaths',
  'surpriseShipment',
  'promos',
] as const;
