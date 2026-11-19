import { selectTaskVariant } from './generator';
import { getFactMastery, getFactVisualStatus } from './sm2';
import type {
  FactFamily,
  GameMode,
  PracticeOperation,
  PracticeWorldScope,
  TaskVariant,
} from './types';

export interface StarProgressV3 {
  current: number;
  total: number;
  percent: number;
  isUnlocked: boolean;
  isAchieved: boolean;
}

export interface WorldChapterV3 {
  id: string;
  title: string;
  icon: string;
  subtitle: string;
  mode: GameMode;
  facts: FactFamily[];
  stars: 0 | 1 | 2 | 3;
  percent: number;
  totalFacts: number;
  masteredFacts: number;
  statusText: string;
  star1Desc: string;
  star2Desc: string;
  star3Desc: string;
  star1Progress: StarProgressV3;
  star2Progress: StarProgressV3;
  star3Progress: StarProgressV3;
}

export interface QueuedTaskV3 {
  fact: FactFamily;
  variant: TaskVariant;
}

export function getFactWorld(fact: FactFamily): 1 | 2 | 3 {
  if (fact.mode === 'mult') {
    // Welt 1: Kernreihen 1, 2, 5, 10 (Gitter-Achsen)
    if (
      fact.a === 1 ||
      fact.a === 2 ||
      fact.a === 5 ||
      fact.a === 10 ||
      fact.b === 1 ||
      fact.b === 2 ||
      fact.b === 5 ||
      fact.b === 10
    ) {
      return 1;
    }
    // Welt 2: Forscher-Aufgaben (Reihen 3 & 4)
    if (fact.a === 3 || fact.a === 4 || fact.b === 3 || fact.b === 4) {
      return 2;
    }
    // Welt 3: Königsaufgaben (Reihen 6, 7, 8, 9)
    return 3;
  } else {
    // Welt 1: Zerlegungen bis 10 (45 Fakten)
    if (fact.c <= 10) return 1;
    // Welt 2: Verdoppeln, Fast-Verdoppeln & Zehner-Bündel (10 + x / x + 10) bis 20 (31 Fakten)
    if (
      fact.a === fact.b ||
      Math.abs(fact.a - fact.b) === 1 ||
      fact.a === 10 ||
      fact.b === 10
    ) {
      return 2;
    }
    // Welt 3: Echter Zehnerübergang (24 Fakten)
    return 3;
  }
}

export function getWorldChaptersV3(
  facts: FactFamily[],
  mode: GameMode
): WorldChapterV3[] {
  if (mode === 'mult') {
    return [
      buildMultChapterV3(
        'mult_1',
        'Insel der Kernreihen',
        '🏝️',
        'Reihen 1, 2, 5, 10 (64 Fakten)',
        facts.filter((f) => getFactWorld(f) === 1),
        'Kernreihen malnehmen (z. B. 2 × 5)',
        'Umkehraufgaben geteilt (z. B. 10 : 2)',
        'Lückenaufgaben (z. B. 2 × ? = 10)'
      ),
      buildMultChapterV3(
        'mult_2',
        'Tal der Forscherreihen',
        '🌋',
        'Reihen 3 & 4 (20 Fakten)',
        facts.filter((f) => getFactWorld(f) === 2),
        'Reihen 3 & 4 malnehmen (z. B. 3 × 7, 4 × 8)',
        'Umkehraufgaben geteilt (z. B. 28 : 4)',
        'Lückenaufgaben (z. B. 4 × ? = 28)'
      ),
      buildMultChapterV3(
        'mult_3',
        'Meister-Gipfel der Königsreihen',
        '🏰',
        'Königsaufgaben 6, 7, 8, 9 (16 Fakten)',
        facts.filter((f) => getFactWorld(f) === 3),
        'Königsreihen malnehmen (z. B. 7 × 8)',
        'Schwere Geteiltaufgaben (z. B. 56 : 7)',
        'Meister-Lücken (z. B. 7 × ? = 56)'
      ),
    ];
  }

  // plusminus (Zahlen-Held) – 100% lückenlose Abdeckung!
  return [
    buildPlusMinusChapterV3(
      'pm_1',
      'Insel der Zehner-Basis',
      '🏝️',
      'Alle Zerlegungen bis 10 (45 Fakten)',
      facts.filter((f) => getFactWorld(f) === 1),
      'Plusaufgaben bis 10 (z. B. 3 + 5, 2 + 8)',
      'Umkehraufgaben Minus (z. B. 8 − 5, 10 − 3)',
      'Ergänzen & Lücken (z. B. 3 + ? = 10)'
    ),
    buildPlusMinusChapterV3(
      'pm_2',
      'Tal der Doppelgänger & Zehnerbündel',
      '⚡',
      'Verdoppeln, Nachbarn & 10er-Bündel (31 Fakten)',
      facts.filter((f) => getFactWorld(f) === 2),
      'Verdoppeln & 10+x (z. B. 6 + 6, 10 + 4)',
      'Halbieren & Minus (z. B. 14 − 7, 14 − 4)',
      'Nachbarn & Lücken (z. B. 6 + 7, 10 + ? = 14)'
    ),
    buildPlusMinusChapterV3(
      'pm_3',
      'Zehner-Gipfel',
      '🚀',
      'Echter Zehnerübergang bis 20 (24 Fakten)',
      facts.filter((f) => getFactWorld(f) === 3),
      'Plus mit Zehnerstopp (z. B. 8 + 5 = 13)',
      'Minus unter die 10 (z. B. 13 − 5 = 8)',
      'Meister-Lücken (z. B. 8 + ? = 13)'
    ),
  ];
}

/**
 * Bestimmt den didaktisch freigeschalteten Fakten-Pool:
 * - Welt 1 ist immer aktiv (Kernaufgaben bzw. Zehnerbasis).
 * - Welt 2 schaltet sich für neue ungelernte Fakten erst frei, wenn Welt 1 mind. Stern 1 hat (80% Hellgrün).
 * - Welt 3 schaltet sich erst frei, wenn Welt 2 mind. Stern 1 hat.
 * - Bei aktivierter freier Weltenwahl (Eltern-Option) sind sofort alle 3 Welten zugänglich.
 */
export function getAccessibleFactsPoolV3(
  facts: FactFamily[],
  mode: GameMode,
  freeWorldChoice = false
): {
  accessibleFacts: FactFamily[];
  unlockedWorldCount: number;
} {
  if (freeWorldChoice) {
    return {
      accessibleFacts: [...facts],
      unlockedWorldCount: 3,
    };
  }

  const chapters = getWorldChaptersV3(facts, mode);
  const rawList: FactFamily[] = [...chapters[0].facts];
  let unlockedWorldCount = 1;

  if (chapters[0].stars >= 1) {
    rawList.push(...chapters[1].facts);
    unlockedWorldCount = 2;
  }

  if (chapters[0].stars >= 1 && chapters[1].stars >= 1) {
    rawList.push(...chapters[2].facts);
    unlockedWorldCount = 3;
  }

  const seenIds = new Set<string>();
  const accessibleFacts: FactFamily[] = [];
  for (const f of rawList) {
    if (!seenIds.has(f.id)) {
      seenIds.add(f.id);
      accessibleFacts.push(f);
    }
  }

  return { accessibleFacts, unlockedWorldCount };
}

/**
 * Prüft, ob eine Faktenfamilie für die gewählte Rechenart noch ungelöst / ungefestigt ist.
 */
export function isOperationUnmasteredV3(
  fact: FactFamily,
  operation: PracticeOperation
): boolean {
  const inverseVar = fact.mode === 'mult' ? 'div' : 'sub';
  switch (operation) {
    case 'inverse':
      return !fact.masteredVariants.includes(inverseVar);
    case 'gap':
      return !fact.masteredVariants.some((v) => v.startsWith('gap_'));
    case 'mix':
      return fact.totalAttempts === 0 || !fact.masteredVariants.includes(inverseVar);
    case 'base':
    default:
      return fact.totalAttempts === 0;
  }
}

/**
 * Filtert die freigeschalteten Fakten strikt auf den gewählten Welten-Scope (`1 | 2 | 3 | 'all'`).
 * Sicherer Fallback: Wenn die gewählte Welt noch gesperrt ist, wird auf die höchste freigeschaltete Welt geclampt.
 */
export function getScopedFactsV3(
  facts: FactFamily[],
  mode: GameMode,
  freeWorldChoice = false,
  worldScope?: PracticeWorldScope
): {
  scopedFacts: FactFamily[];
  effectiveScope: PracticeWorldScope;
  accessibleFacts: FactFamily[];
  unlockedWorldCount: number;
} {
  const { accessibleFacts, unlockedWorldCount } = getAccessibleFactsPoolV3(
    facts,
    mode,
    freeWorldChoice
  );

  let effectiveScope: PracticeWorldScope = worldScope ?? (freeWorldChoice ? 'all' : 1);
  if (typeof effectiveScope === 'number' && effectiveScope > unlockedWorldCount) {
    effectiveScope = unlockedWorldCount as 1 | 2 | 3;
  }

  const scopedFacts =
    effectiveScope === 'all'
      ? accessibleFacts
      : accessibleFacts.filter((f) => getFactWorld(f) === effectiveScope);

  return {
    scopedFacts,
    effectiveScope,
    accessibleFacts,
    unlockedWorldCount,
  };
}

function buildMultChapterV3(
  id: string,
  title: string,
  icon: string,
  subtitle: string,
  chapterFacts: FactFamily[],
  star1Desc: string,
  star2Desc: string,
  star3Desc: string
): WorldChapterV3 {
  return computeChapterStatsV3(
    id,
    title,
    icon,
    subtitle,
    'mult',
    chapterFacts,
    star1Desc,
    star2Desc,
    star3Desc
  );
}

function buildPlusMinusChapterV3(
  id: string,
  title: string,
  icon: string,
  subtitle: string,
  chapterFacts: FactFamily[],
  star1Desc: string,
  star2Desc: string,
  star3Desc: string
): WorldChapterV3 {
  return computeChapterStatsV3(
    id,
    title,
    icon,
    subtitle,
    'plusminus',
    chapterFacts,
    star1Desc,
    star2Desc,
    star3Desc
  );
}

function computeChapterStatsV3(
  id: string,
  title: string,
  icon: string,
  subtitle: string,
  mode: GameMode,
  chapterFacts: FactFamily[],
  star1Desc: string,
  star2Desc: string,
  star3Desc: string
): WorldChapterV3 {
  const totalFacts = chapterFacts.length || 1;

  // Stufe 1: Fakt hat mindestens Hellgrün (green_step1, green_step2, green_step3 oder Krone) erreicht
  const s1Learned = chapterFacts.filter((f) => {
    const status = getFactVisualStatus(f);
    return status.level.startsWith('green_') || status.hasCrown;
  }).length;
  const s1Percent = Math.min(100, Math.round((s1Learned / totalFacts) * 100));
  const s1Achieved = s1Percent >= 80 && s1Learned >= 1;

  const star1Progress: StarProgressV3 = {
    current: s1Learned,
    total: totalFacts,
    percent: s1Percent,
    isUnlocked: true,
    isAchieved: s1Achieved,
  };

  // Stufe 2: Umkehraufgabe gemeistert (div bzw. sub in masteredVariants)
  const targetInverse = mode === 'mult' ? 'div' : 'sub';
  const s2Learned = chapterFacts.filter((f) =>
    f.masteredVariants.includes(targetInverse)
  ).length;
  const s2Percent = Math.min(100, Math.round((s2Learned / totalFacts) * 100));
  const s2Unlocked = s1Achieved;
  const s2Achieved = s2Unlocked && s2Percent >= 80 && s2Learned >= 1;

  const star2Progress: StarProgressV3 = {
    current: s2Learned,
    total: totalFacts,
    percent: s2Percent,
    isUnlocked: s2Unlocked,
    isAchieved: s2Achieved,
  };

  // Stufe 3: Lückenaufgabe gemeistert
  const s3Learned = chapterFacts.filter((f) =>
    f.masteredVariants.some((v) => v.startsWith('gap_'))
  ).length;
  const s3Percent = Math.min(100, Math.round((s3Learned / totalFacts) * 100));
  const s3Unlocked = s2Achieved;
  const s3Achieved = s3Unlocked && s3Percent >= 80 && s3Learned >= 1;

  const star3Progress: StarProgressV3 = {
    current: s3Learned,
    total: totalFacts,
    percent: s3Percent,
    isUnlocked: s3Unlocked,
    isAchieved: s3Achieved,
  };

  let stars: 0 | 1 | 2 | 3 = 0;
  if (s3Achieved) stars = 3;
  else if (s2Achieved) stars = 2;
  else if (s1Achieved) stars = 1;

  let percent = 0;
  if (stars === 3) percent = 100;
  else if (stars === 2) percent = s3Percent;
  else if (stars === 1) percent = s2Percent;
  else percent = s1Percent;

  let statusText = 'Noch unentdeckt';
  if (stars === 3) statusText = 'Gemeistert! ⭐⭐⭐';
  else if (stars === 2) statusText = `Stufe 3: ${s3Learned}/${totalFacts} gemeistert (${s3Percent}%)`;
  else if (stars === 1) statusText = `Stufe 2: ${s2Learned}/${totalFacts} gemeistert (${s2Percent}%)`;
  else if (s1Learned > 0) statusText = `Stufe 1: ${s1Learned}/${totalFacts} gelernt (${s1Percent}%)`;

  const masteredFacts = chapterFacts.filter(
    (f) => getFactMastery(f) === 'mastered'
  ).length;

  return {
    id,
    title,
    icon,
    subtitle,
    mode,
    facts: chapterFacts,
    stars,
    percent,
    totalFacts,
    masteredFacts,
    statusText,
    star1Desc,
    star2Desc,
    star3Desc,
    star1Progress,
    star2Progress,
    star3Progress,
  };
}

/**
 * Erstellt eine intelligente Übungsrunde für eine bestimmte Rechenwelt
 * anhand der explizit gewählten Rechenart (kein automatischer Zwang auf Minus/Lücken).
 */
export function buildChapterSessionQueueV3(
  chapter: WorldChapterV3,
  sessionSize = 10,
  operation: PracticeOperation = 'base'
): QueuedTaskV3[] {
  const pool = [...chapter.facts];

  // Fällige oder fehlerhafte Fakten priorisieren
  const due = pool.filter(
    (f) => f.totalAttempts > 0 && (f.dueDate <= Date.now() || f.repetitions === 0)
  );
  const dueIds = new Set(due.map((f) => f.id));
  const unlearned = pool.filter(
    (f) => isOperationUnmasteredV3(f, operation) && !dueIds.has(f.id)
  );
  const mastered = pool.filter(
    (f) => getFactMastery(f) === 'mastered' && !dueIds.has(f.id)
  );

  const selectedFacts: FactFamily[] = [];

  // 1. Bis zu 60% fällige Aufgaben
  const maxDue = Math.min(due.length, Math.ceil(sessionSize * 0.6));
  selectedFacts.push(...due.slice(0, maxDue));

  // 2. Für die gewählte Rechenart noch ungemeisterte Aufgaben
  const neededForNew = sessionSize - selectedFacts.length;
  const shuffledUnlearned = [...unlearned].sort(() => Math.random() - 0.5);
  for (const f of shuffledUnlearned) {
    if (selectedFacts.length >= maxDue + neededForNew) break;
    if (!selectedFacts.some((s) => s.id === f.id)) {
      selectedFacts.push(f);
    }
  }

  // 3. Mit Wiederholungen auffüllen
  if (selectedFacts.length < sessionSize && mastered.length > 0) {
    const shuffledMastered = [...mastered].sort(() => Math.random() - 0.5);
    for (const f of shuffledMastered) {
      if (selectedFacts.length >= sessionSize) break;
      if (!selectedFacts.some((s) => s.id === f.id)) {
        selectedFacts.push(f);
      }
    }
  }

  // 4. Notfall-Auffüllen (gemischt, nicht nach Schleifen-Reihenfolge!)
  if (selectedFacts.length < sessionSize) {
    const rest = pool
      .filter((f) => !selectedFacts.some((s) => s.id === f.id))
      .sort(() => Math.random() - 0.5);
    selectedFacts.push(...rest.slice(0, sessionSize - selectedFacts.length));
  }

  // Mischen und Variante strikt anhand der gewählten Rechenart zuordnen
  const shuffled = [...selectedFacts].sort(() => Math.random() - 0.5);

  return shuffled.map((fact) => ({
    fact,
    variant: selectTaskVariant(fact, operation),
  }));
}
