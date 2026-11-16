export interface StickerItem {
  id: string;
  name: string;
  emoji: string;
  category: 'animals' | 'space' | 'magic' | 'champions';
  cost: number;
  description: string;
}

export type StickerCategory = 'animals' | 'space' | 'magic' | 'champions';

export const STICKER_CATEGORIES: { id: StickerCategory; label: string; icon: string }[] = [
  { id: 'animals', label: 'Tiere', icon: '🐾' },
  { id: 'space', label: 'Weltraum', icon: '🚀' },
  { id: 'magic', label: 'Magie', icon: '🦄' },
  { id: 'champions', label: 'Champions', icon: '🏆' },
];

export const ALL_STICKERS: StickerItem[] = [
  // --- 🐾 TIERE & NATUR (10 – 35 ⭐) ---
  {
    id: 'tier_fuchs',
    name: 'Schlauer Fuchs',
    emoji: '🦊',
    category: 'animals',
    cost: 10,
    description: 'Rechnet blitzschnell und findet immer den cleversten Trick.',
  },
  {
    id: 'tier_hase',
    name: 'Schneller Hase',
    emoji: '🐰',
    category: 'animals',
    cost: 15,
    description: 'Hüpft munter von Aufgabe zu Aufgabe ohne Rast.',
  },
  {
    id: 'tier_eule',
    name: 'Weise Eule',
    emoji: '🦉',
    category: 'animals',
    cost: 20,
    description: 'Behält auch bei großen Zahlen stets den vollen Durchblick.',
  },
  {
    id: 'tier_loewe',
    name: 'Mutiger Löwe',
    emoji: '🦁',
    category: 'animals',
    cost: 25,
    description: 'Stellt sich tapfer jeder noch so kniffligen Königsaufgabe.',
  },
  {
    id: 'tier_delfin',
    name: 'Fröhlicher Delfin',
    emoji: '🐬',
    category: 'animals',
    cost: 30,
    description: 'Gleitet spielerisch und mit Freude durch alle Zahlenmeere.',
  },
  {
    id: 'tier_panda',
    name: 'Entspannter Panda',
    emoji: '🐼',
    category: 'animals',
    cost: 35,
    description: 'Bleibt auch bei schwierigen Aufgaben immer ruhig und gelassen.',
  },

  // --- 🚀 WELTRAUM & GALAXIE (45 – 80 ⭐) ---
  {
    id: 'space_stern',
    name: 'Glitzer-Stern',
    emoji: '⭐',
    category: 'space',
    cost: 45,
    description: 'Leuchtet golden für jede gelöste Aufgabe am Rechenhimmel.',
  },
  {
    id: 'space_rakete',
    name: 'Turbo-Rakete',
    emoji: '🚀',
    category: 'space',
    cost: 50,
    description: 'Schießt deinen Highscore mit Lichtgeschwindigkeit nach oben.',
  },
  {
    id: 'space_alien',
    name: 'Kosmo-Alien',
    emoji: '👽',
    category: 'space',
    cost: 60,
    description: 'Erforscht neugierig fremde Planeten und neue Rechenregeln.',
  },
  {
    id: 'space_astronaut',
    name: 'Sternen-Astronaut',
    emoji: '🧑‍🚀',
    category: 'space',
    cost: 65,
    description: 'Macht riesige Schritte und schwebt sicher über alle Hürden.',
  },
  {
    id: 'space_ufo',
    name: 'Schnelles UFO',
    emoji: '🛸',
    category: 'space',
    cost: 75,
    description: 'Landet punktgenau und federleicht auf dem richtigen Ergebnis.',
  },
  {
    id: 'space_planet',
    name: 'Ring-Planet',
    emoji: '🪐',
    category: 'space',
    cost: 80,
    description: 'Ein ganzes Sonnensystem voller mathematischer Entdeckungen.',
  },

  // --- 🦄 MAGIE & FABELWESEN (100 – 160 ⭐) ---
  {
    id: 'magic_pilz',
    name: 'Glücks-Pilz',
    emoji: '🍄',
    category: 'magic',
    cost: 100,
    description: 'Schenkt dir Extra-Konzentration bei Wackelkandidaten.',
  },
  {
    id: 'magic_hut',
    name: 'Zauberhut',
    emoji: '🧙',
    category: 'magic',
    cost: 110,
    description: 'Verwandelt schwere Rechnungen im Nu in kinderleichte Schritte.',
  },
  {
    id: 'magic_kristall',
    name: 'Glaskugel',
    emoji: '🔮',
    category: 'magic',
    cost: 120,
    description: 'Sieht das richtige Ergebnis schon vor dem Eintippen voraus.',
  },
  {
    id: 'magic_stab',
    name: 'Zauberstab',
    emoji: '🪄',
    category: 'magic',
    cost: 135,
    description: 'Ein kleiner Schwung und schon sitzt das 1×1 wie von Zauberhand.',
  },
  {
    id: 'magic_einhorn',
    name: 'Sternen-Einhorn',
    emoji: '🦄',
    category: 'magic',
    cost: 150,
    description: 'Galoppiert stolz über bunte Regenbögen zum Tages-Ziel.',
  },
  {
    id: 'magic_drache',
    name: 'Feuer-Drache',
    emoji: '🐉',
    category: 'magic',
    cost: 160,
    description: 'Brennt voller Begeisterung für neue Rekorde und Auszeichnungen.',
  },

  // --- 🏆 MATHE-CHAMPIONS & TROPHÄEN (200 – 500 ⭐) ---
  {
    id: 'champ_blitz',
    name: 'Blitz-Meister',
    emoji: '⚡',
    category: 'champions',
    cost: 200,
    description: 'Schneller als der Blitz – automatisiertes Kopfrechnen in Perfektion.',
  },
  {
    id: 'champ_roboter',
    name: 'Rechen-Roboter',
    emoji: '🤖',
    category: 'champions',
    cost: 250,
    description: 'Rechnet unermüdlich und fehlerfrei wie ein Supercomputer.',
  },
  {
    id: 'champ_held',
    name: 'Zahlen-Superheld',
    emoji: '🦸',
    category: 'champions',
    cost: 300,
    description: 'Rettet jeden Wackelkandidaten und meistert die ganze Tafel.',
  },
  {
    id: 'champ_pokal',
    name: 'Gold-Pokal',
    emoji: '🏆',
    category: 'champions',
    cost: 350,
    description: 'Die Trophäe für echte Ausdauer und fleißiges tägliches Üben.',
  },
  {
    id: 'champ_diamant',
    name: 'Meister-Diamant',
    emoji: '💎',
    category: 'champions',
    cost: 400,
    description: 'Funkelnd und unzerstörbar im Langzeitgedächtnis verankert.',
  },
  {
    id: 'champ_krone',
    name: 'Königs-Krone',
    emoji: '👑',
    category: 'champions',
    cost: 500,
    description: 'Die höchste Krone für wahre Rechen-Legenden der 100er-Tafel.',
  },
];

export function getStickersByCategory(category: StickerCategory): StickerItem[] {
  return ALL_STICKERS.filter((s) => s.category === category);
}

export function findStickerById(id: string): StickerItem | undefined {
  return ALL_STICKERS.find((s) => s.id === id);
}
