import {
  generateMultFacts,
  generatePlusMinusFacts,
  selectTaskVariant,
} from './generator';
import { checkHasV2Data, importProfilesFromV2 } from './migration';
import { getAccessibleFactsPoolV3, getFactWorld, type QueuedTaskV3 } from './chapters';
import type {
  FactFamily,
  GameMode,
  TaskVariant,
  UserProfileV3,
  UserStatsV3,
} from './types';

export const V3_PROFILES_STORAGE_KEY = 'v3_profiles';
export const V3_ACTIVE_PROFILE_ID_KEY = 'v3_active_profile_id';
export const V3_THEME_STORAGE_KEY = 'v3_theme_preference';

export const AVAILABLE_AVATARS = [
  '🐧',
  '🦦',
  '🦊',
  '🦁',
  '🐼',
  '🦉',
  '🦄',
  '🚀',
  '🦖',
  '🐯',
  '🐨',
  '⭐',
];

export function getDefaultStatsV3(): UserStatsV3 {
  return {
    stars: 0,
    streakDays: 0,
    lastPracticeDate: null,
    totalSolved: 0,
    fastSolved: 0,
    soundEnabled: true,
    sessionSize: 10,
  };
}

export function getLocalDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export const ONBOARDING_COMPLETED_KEY = 'zahlenblitz_v3_onboarding_completed';

export function checkNeedsOnboardingV3(profiles: UserProfileV3[]): boolean {
  if (typeof window === 'undefined') return false;
  const isDone = window.localStorage.getItem(ONBOARDING_COMPLETED_KEY);
  if (isDone === 'true') return false;

  const hasHistory = profiles.some(
    (p) => (p.multStats?.totalSolved ?? 0) > 0 || (p.plusMinusStats?.totalSolved ?? 0) > 0
  );
  if (hasHistory) {
    try {
      window.localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
    } catch {}
    return false;
  }
  return true;
}

export function createNewProfileV3(
  name = 'Spieler 1',
  avatar = '🦊',
  activeGameMode: GameMode = 'plusminus'
): UserProfileV3 {
  const id = `user_v3_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  return {
    id,
    name: name.trim() || 'Spieler 1',
    avatar,
    activeGameMode,
    createdAt: Date.now(),
    multStats: getDefaultStatsV3(),
    multFacts: generateMultFacts(),
    plusMinusStats: getDefaultStatsV3(),
    plusMinusFacts: generatePlusMinusFacts(),
    unlockedStickers: [],
  };
}

export function loadV3ProfilesAndActiveId(): {
  profiles: UserProfileV3[];
  activeProfileId: string;
} {
  if (typeof window === 'undefined') {
    const fallback = createNewProfileV3();
    return { profiles: [fallback], activeProfileId: fallback.id };
  }

  try {
    const raw = window.localStorage.getItem(V3_PROFILES_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as UserProfileV3[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Falls in v3 nur ein ungespieltes Dummy-Profil liegt, aber v2 echte Daten hat: automatisch migrieren!
        const isUnplayedDefault =
          parsed.length === 1 &&
          (parsed[0].multStats.totalSolved ?? 0) === 0 &&
          (parsed[0].multStats.stars ?? 0) === 0 &&
          (parsed[0].plusMinusStats.totalSolved ?? 0) === 0 &&
          (parsed[0].plusMinusStats.stars ?? 0) === 0;

        if (isUnplayedDefault && checkHasV2Data()) {
          const autoImport = importProfilesFromV2();
          if (autoImport.success && autoImport.profiles.length > 0) {
            return {
              profiles: autoImport.profiles,
              activeProfileId: autoImport.profiles[0].id,
            };
          }
        }

        const sanitized = parsed.map((p) => ({
          ...p,
          unlockedStickers: p.unlockedStickers ?? [],
        }));
        const savedActiveId = window.localStorage.getItem(V3_ACTIVE_PROFILE_ID_KEY);
        const exists = sanitized.some((p) => p.id === savedActiveId);
        const activeProfileId = exists && savedActiveId ? savedActiveId : sanitized[0].id;
        return { profiles: sanitized, activeProfileId };
      }
    }

    // Wenn v3 noch gar keine Daten hat: automatisch verlustfrei aus v2 übernehmen!
    if (checkHasV2Data()) {
      const autoImport = importProfilesFromV2();
      if (autoImport.success && autoImport.profiles.length > 0) {
        return {
          profiles: autoImport.profiles,
          activeProfileId: autoImport.profiles[0].id,
        };
      }
    }
  } catch {}

  const initial = createNewProfileV3();
  saveV3ProfilesAndActiveId([initial], initial.id);
  return { profiles: [initial], activeProfileId: initial.id };
}

export function saveV3ProfilesAndActiveId(
  profiles: UserProfileV3[],
  activeProfileId: string
): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(V3_PROFILES_STORAGE_KEY, JSON.stringify(profiles));
    window.localStorage.setItem(V3_ACTIVE_PROFILE_ID_KEY, activeProfileId);
  } catch {}
}

export function registerDailyPracticeV3(stats: UserStatsV3): UserStatsV3 {
  const today = getLocalDateString();
  if (stats.lastPracticeDate === today) {
    return stats.streakDays === 0 ? { ...stats, streakDays: 1 } : stats;
  }

  let nextStreak = 1;
  if (stats.lastPracticeDate) {
    // Kindgerechter Wochenend- & Reisepuffer:
    // Grundschulkinder haben kein eigenes Smartphone und sind am Wochenende oder auf Ausflügen oft ohne Tablet.
    // Bis zu 3 Tage Pause (z.B. Freitag geübt -> Sa/So Pause -> Montag wieder da) brechen die Serie NICHT ab!
    const todayDate = new Date(today + 'T00:00:00');
    const lastDate = new Date(stats.lastPracticeDate + 'T00:00:00');
    const diffMs = todayDate.getTime() - lastDate.getTime();
    const diffDays = Math.round(diffMs / (1000 * 3600 * 24));

    if (diffDays >= 1 && diffDays <= 3) {
      nextStreak = (stats.streakDays || 0) + 1;
    } else {
      nextStreak = 1;
    }
  }

  return {
    ...stats,
    streakDays: nextStreak,
    lastPracticeDate: today,
  };
}

/**
 * Entzerrt die Session-Queue:
 * - Keine direkte Nachbarschaft derselben Faktenfamilie (Abstand >= 3)
 * - Keine 3 Lückenaufgaben in Folge
 */
export function smartShuffleV3(tasks: QueuedTaskV3[]): QueuedTaskV3[] {
  if (tasks.length <= 1) return [...tasks];

  const pool = [...tasks];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const result: QueuedTaskV3[] = [];
  const remaining = [...pool];

  while (remaining.length > 0) {
    const recentFamilies = result.slice(-2).map((t) => t.fact.id);
    const lastTwoAreGaps =
      result.length >= 2 &&
      result[result.length - 1].variant.startsWith('gap_') &&
      result[result.length - 2].variant.startsWith('gap_');

    let candidateIdx = remaining.findIndex((t) => {
      if (lastTwoAreGaps && t.variant.startsWith('gap_')) return false;
      if (recentFamilies.includes(t.fact.id)) return false;
      return true;
    });

    if (candidateIdx === -1) {
      candidateIdx = remaining.findIndex((t) => !recentFamilies.includes(t.fact.id));
    }
    if (candidateIdx === -1 && result.length > 0) {
      const lastFam = result[result.length - 1].fact.id;
      candidateIdx = remaining.findIndex((t) => t.fact.id !== lastFam);
    }
    if (candidateIdx === -1) {
      candidateIdx = 0;
    }

    result.push(remaining.splice(candidateIdx, 1)[0]);
  }

  return result;
}

/**
 * Ordnet ungelernte Fakten didaktisch ausgewogen und abwechslungsreich:
 * - Verhindert starre Schleifenabfolgen (wie 1x1, 2x1, 3x1...)
 * - Welt 1 bei 1x1: Mischt die 4 Kernreihen (2er, 5er, 10er, 1er) im Round-Robin,
 *   sodass Verdoppeln (2x) und Fünfersprünge (5x) von der ersten Session an gleichberechtigt
 *   neben den 1er- und 10er-Aufgaben vorkommen.
 * - Welt 1 bei Zahlen-Held: Ausgewogene Mischung aus Verdoppeln, Partnern zur 10,
 *   Fast-Verdoppeln und Zerlegungen.
 * - Sukzessiver Weltenaufbau: Fakten aus freigeschalteten Welten werden weltweise
 *   (oder bei freeWorldChoice weltübergreifend) geordnet.
 */
export function orderUnlearnedFactsV3(
  unlearnedRaw: FactFamily[],
  mode: GameMode,
  freeWorldChoice = false
): FactFamily[] {
  if (unlearnedRaw.length === 0) return [];

  // Hilfsfunktion: Mischt mehrere Eimer im Round-Robin-Verfahren
  const roundRobin = (buckets: FactFamily[][]): FactFamily[] => {
    const shuffledBuckets = buckets.map((b) => [...b].sort(() => Math.random() - 0.5));
    const result: FactFamily[] = [];
    while (shuffledBuckets.some((b) => b.length > 0)) {
      for (const bucket of shuffledBuckets) {
        if (bucket.length > 0) {
          result.push(bucket.shift()!);
        }
      }
    }
    return result;
  };

  // Hilfsfunktion zur didaktischen Ausbalancierung einer einzelnen Welt
  const balanceWorld = (facts: FactFamily[], worldNum: number): FactFamily[] => {
    if (facts.length === 0) return [];

    if (mode === 'mult') {
      if (worldNum === 1) {
        // Kernreihen: 2er (Verdoppeln), 5er, 10er, 1er gleichberechtigt mischen!
        const b2: FactFamily[] = [];
        const b5: FactFamily[] = [];
        const b10: FactFamily[] = [];
        const b1: FactFamily[] = [];

        for (const f of facts) {
          if (f.a === 2 || f.b === 2) {
            b2.push(f);
          } else if (f.a === 5 || f.b === 5) {
            b5.push(f);
          } else if (f.a === 10 || f.b === 10) {
            b10.push(f);
          } else {
            b1.push(f);
          }
        }
        return roundRobin([b2, b5, b10, b1]);
      } else if (worldNum === 2) {
        // Forscherreihen: 3er und 4er abwechselnd
        const b3 = facts.filter((f) => f.a === 3 || f.b === 3);
        const b4 = facts.filter((f) => !b3.includes(f));
        return roundRobin([b3, b4]);
      } else {
        // Königsreihen (6, 7, 8, 9): Bunt gemischt
        return [...facts].sort(() => Math.random() - 0.5);
      }
    } else {
      // plusminus (Zahlen-Held)
      if (worldNum === 1) {
        // Ausgewogener Mix: Verdoppeln, Partner zur 10, Fast-Verdoppeln, Zerlegungen
        const bDoubles = facts.filter((f) => f.a === f.b);
        const bTens = facts.filter((f) => f.c === 10 && f.a !== f.b);
        const bNear = facts.filter((f) => Math.abs(f.a - f.b) === 1);
        const bRest = facts.filter(
          (f) => !bDoubles.includes(f) && !bTens.includes(f) && !bNear.includes(f)
        );
        return roundRobin([bDoubles, bTens, bNear, bRest]);
      } else if (worldNum === 2) {
        // Zehnerbündel (10+x / x+10), Verdoppeln > 10, Fast-Verdoppeln
        const bTens = facts.filter((f) => f.a === 10 || f.b === 10);
        const bDoubles = facts.filter((f) => f.a === f.b && !bTens.includes(f));
        const bRest = facts.filter((f) => !bTens.includes(f) && !bDoubles.includes(f));
        return roundRobin([bTens, bDoubles, bRest]);
      } else {
        // Zehnerübergang: Bunt gemischt
        return [...facts].sort(() => Math.random() - 0.5);
      }
    }
  };

  const w1 = balanceWorld(unlearnedRaw.filter((f) => getFactWorld(f) === 1), 1);
  const w2 = balanceWorld(unlearnedRaw.filter((f) => getFactWorld(f) === 2), 2);
  const w3 = balanceWorld(unlearnedRaw.filter((f) => getFactWorld(f) === 3), 3);

  if (freeWorldChoice) {
    // Bei freier Weltenwahl: Round-Robin über alle 3 Welten
    return roundRobin([w1, w2, w3]);
  }

  // Didaktischer Standard-Pfad: Erst Welt 1 meistern, dann Welt 2, dann Welt 3
  return [...w1, ...w2, ...w3];
}

/**
 * Erstellt die Tages-Mission (Daily Session Queue):
 * - Beachtet den didaktischen Welten-Schutz: Neue Fakten kommen NUR aus freigeschalteten Welten!
 * - Mischt fällige Wiederholungen (max. 60%) mit neuen Fakten (30%) und Festigung (10%).
 * - Weist jedem Faktum über selectTaskVariant() eine kindgerechte Darstellungsform zu.
 */
export function buildDailySessionQueueV3(
  facts: FactFamily[],
  sessionSize = 10,
  now = Date.now(),
  freeWorldChoice = false
): QueuedTaskV3[] {
  const mode = facts[0]?.mode ?? 'mult';
  const { accessibleFacts } = getAccessibleFactsPoolV3(facts, mode, freeWorldChoice);
  const accessibleIds = new Set(accessibleFacts.map((f) => f.id));

  // 1. Fällige Wiederholungen aus allen bereits begonnenen Aufgaben
  const due = facts
    .filter((f) => f.totalAttempts > 0 && (f.dueDate <= now || f.repetitions === 0))
    .sort((a, b) => {
      if (a.repetitions === 0 && b.repetitions !== 0) return -1;
      if (b.repetitions === 0 && a.repetitions !== 0) return 1;
      return a.dueDate - b.dueDate;
    });

  // 2. Neue ungelernte Fakten – STRENG GEFILTERT auf die freigeschalteten Welten und didaktisch ausbalanciert!
  const unlearnedRaw = facts
    .filter((f) => f.totalAttempts === 0 && accessibleIds.has(f.id));

  const unlearned = orderUnlearnedFactsV3(unlearnedRaw, mode, freeWorldChoice);

  // 3. Zukünftige Festigungs-Fakten (nur aus freigeschalteten Welten)
  const upcoming = facts
    .filter(
      (f) =>
        f.totalAttempts > 0 &&
        f.dueDate > now &&
        f.repetitions > 0 &&
        accessibleIds.has(f.id)
    )
    .sort((a, b) => a.dueDate - b.dueDate);

  const selectedFacts: FactFamily[] = [];

  const maxDue = Math.min(due.length, Math.floor(sessionSize * 0.6));
  selectedFacts.push(...due.slice(0, maxDue));

  const neededForNew = sessionSize - selectedFacts.length;
  if (neededForNew > 0 && unlearned.length > 0) {
    selectedFacts.push(...unlearned.slice(0, neededForNew));
  }

  if (selectedFacts.length < sessionSize) {
    const extraDue = due.slice(maxDue, maxDue + (sessionSize - selectedFacts.length));
    selectedFacts.push(...extraDue);
  }
  if (selectedFacts.length < sessionSize) {
    selectedFacts.push(...upcoming.slice(0, sessionSize - selectedFacts.length));
  }

  // Falls das Kind an einem Tag sehr viel spielt und alle freigeschalteten Fakten schon dran waren:
  // Fülle NUR aus bereits bekannten Fakten des freigeschalteten Pools auf (Festigung/Tempo), NIEMALS aus gesperrten Welten!
  if (selectedFacts.length < sessionSize) {
    const fallbackPool = accessibleFacts.filter(
      (f) => !selectedFacts.some((s) => s.id === f.id)
    );
    selectedFacts.push(...fallbackPool.slice(0, sessionSize - selectedFacts.length));
  }

  // Bestimme für jede Rechenwelt, ob alle Basis-Aufgaben bereits mindestens 1x gelernt wurden
  const worldBaseLearnedMap = new Map<number, boolean>();
  for (const w of [1, 2, 3]) {
    const wFacts = facts.filter((f) => getFactWorld(f) === w);
    const allLearned = wFacts.length > 0 && wFacts.every((f) => f.repetitions >= 1);
    worldBaseLearnedMap.set(w, allLearned);
  }

  // Jeder gewählten Faktenfamilie eine dynamische Variante zuweisen:
  // Geteilt- und Minusaufgaben werden erst eingesteuert, wenn alle Basisaufgaben der jeweiligen Welt mindestens 1x gelernt wurden!
  const tasks: QueuedTaskV3[] = selectedFacts.map((fact) => {
    const world = getFactWorld(fact);
    const allowInverse = worldBaseLearnedMap.get(world) ?? false;
    return {
      fact,
      variant: selectTaskVariant(fact, allowInverse),
    };
  });

  return smartShuffleV3(tasks);
}

/**
 * Erstellt eine gezielte Übungsrunde für eine bestimmte Reihe (z. B. 7er-Reihe oder Rechnen mit 7).
 * Beinhaltet alle 10 Kern-Aufgaben dieser Reihe, priorisiert fällige/ungelernte und mischt sie.
 */
export function buildRowSessionQueueV3(
  facts: FactFamily[],
  targetNumber: number,
  sessionSize = 10
): QueuedTaskV3[] {
  // Bevorzuge primär a === targetNumber (z. B. 7 × 1 .. 7 × 10), ergänze mit Tauschaufgaben (b === targetNumber)
  const primaryFacts = facts.filter((f) => f.a === targetNumber);
  const secondaryFacts = facts.filter((f) => f.b === targetNumber && f.a !== targetNumber);
  const pool = [...primaryFacts, ...secondaryFacts];

  if (pool.length === 0) return [];

  // Fällige / fehlerhafte Aufgaben zuerst
  const due = pool.filter(
    (f) => f.totalAttempts > 0 && (f.dueDate <= Date.now() || f.repetitions === 0)
  );
  const unlearned = pool.filter((f) => f.totalAttempts === 0);
  const mastered = pool.filter((f) => f.repetitions > 0);

  const selectedFacts: FactFamily[] = [];

  // 1. Fällige Wiederholungen
  selectedFacts.push(...due);

  // 2. Neue ungelernte Aufgaben dieser Reihe
  for (const f of unlearned) {
    if (selectedFacts.length >= sessionSize) break;
    if (!selectedFacts.some((s) => s.id === f.id)) {
      selectedFacts.push(f);
    }
  }

  // 3. Mit Wiederholungen auffüllen
  for (const f of mastered.sort(() => Math.random() - 0.5)) {
    if (selectedFacts.length >= sessionSize) break;
    if (!selectedFacts.some((s) => s.id === f.id)) {
      selectedFacts.push(f);
    }
  }

  // 4. Fallback aus primaryFacts
  for (const f of primaryFacts) {
    if (selectedFacts.length >= sessionSize) break;
    if (!selectedFacts.some((s) => s.id === f.id)) {
      selectedFacts.push(f);
    }
  }

  // Prüfen, ob alle Basisaufgaben dieser Reihe bereits mindestens 1x gelöst wurden
  const allBaseLearned = primaryFacts.every((f) => f.repetitions >= 1);

  const tasks: QueuedTaskV3[] = selectedFacts.slice(0, sessionSize).map((fact) => ({
    fact,
    variant: selectTaskVariant(fact, allBaseLearned),
  }));

  return smartShuffleV3(tasks);
}

/**
 * Ermittelt alle Fakten, bei denen das Kind noch Unsicherheiten zeigt:
 * 1. Kürzlicher Fehler (lastQuality === 0 oder repetitions === 0 nach Versuchen)
 * 2. Geringe Verlässlichkeit (easeFactor < 2.2)
 * 3. Lange Rechenzeit (> 8 Sekunden)
 * 4. Mehrere Fehlversuche (Trefferquote < 75%)
 */
export function getWeakSpotFactsV3(facts: FactFamily[]): FactFamily[] {
  return facts
    .filter((f) => {
      if (f.totalAttempts === 0) return false;
      if (f.repetitions === 0 || f.lastQuality === 0) return true;
      if (f.easeFactor < 2.2) return true;
      if (typeof f.lastResponseMs === 'number' && f.lastResponseMs > 8000) return true;
      if (f.totalAttempts >= 2 && f.correctAttempts / f.totalAttempts < 0.75) return true;
      return false;
    })
    .sort((a, b) => {
      const aWeight =
        (a.lastQuality === 0 ? 100 : 0) +
        (3.0 - a.easeFactor) * 20 +
        ((a.lastResponseMs || 0) / 1000);
      const bWeight =
        (b.lastQuality === 0 ? 100 : 0) +
        (3.0 - b.easeFactor) * 20 +
        ((b.lastResponseMs || 0) / 1000);
      return bWeight - aWeight;
    });
}

/**
 * Erstellt eine fokussierte Übungsrunde für die Wackelkandidaten (Schwachstellen-Trainer).
 */
export function buildWeakSpotsSessionQueueV3(
  facts: FactFamily[],
  sessionSize = 10
): QueuedTaskV3[] {
  const weakSpots = getWeakSpotFactsV3(facts);
  if (weakSpots.length === 0) return [];

  const selectedFacts: FactFamily[] = [...weakSpots.slice(0, sessionSize)];

  // Falls weniger als sessionSize Wackelkandidaten vorhanden sind, mit begonnenen Fakten auffüllen
  if (selectedFacts.length < sessionSize) {
    const fallbackPool = facts.filter(
      (f) => f.totalAttempts > 0 && !selectedFacts.some((s) => s.id === f.id)
    );
    selectedFacts.push(...fallbackPool.slice(0, sessionSize - selectedFacts.length));
  }

  // Falls immer noch Plätze frei sind (z.B. am Anfang mit wenigen Aufgaben):
  // Wiederhole die Wackelkandidaten gezielt, bis die Runde voll ist
  while (selectedFacts.length < sessionSize && weakSpots.length > 0) {
    const candidate = weakSpots[selectedFacts.length % weakSpots.length];
    selectedFacts.push(candidate);
  }

  const tasks: QueuedTaskV3[] = selectedFacts.map((fact) => ({
    fact,
    variant:
      fact.lastQuality === 0
        ? fact.mode === 'mult'
          ? 'mult'
          : 'add'
        : selectTaskVariant(fact),
  }));

  return smartShuffleV3(tasks);
}

/**
 * Erstellt eine schnelle Aufgaben-Queue für die 60-Sekunden-Blitz-Challenge:
 * - Zieht nur bereits freigeschaltete und schon mindestens 1x gesehene Fakten (oder Welt 1 Grundaufgaben)
 * - Bevorzugt schnelle Grund- und Umkehraufgaben für maximalen Spielspaß ohne Lückenverwirrung
 */
export function buildBlitzChallengeQueueV3(
  facts: FactFamily[],
  count = 60
): QueuedTaskV3[] {
  const mode = facts[0]?.mode ?? 'mult';
  const { accessibleFacts } = getAccessibleFactsPoolV3(facts, mode);

  let pool = accessibleFacts.filter((f) => f.repetitions >= 1);
  if (pool.length < 10) {
    pool = accessibleFacts;
  }

  const result: QueuedTaskV3[] = [];
  while (result.length < count) {
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    for (const fact of shuffled) {
      const variant: TaskVariant =
        mode === 'mult'
          ? Math.random() < 0.65 || fact.repetitions < 2
            ? 'mult'
            : 'div'
          : Math.random() < 0.65 || fact.repetitions < 2
            ? 'add'
            : 'sub';

      result.push({ fact, variant });
      if (result.length >= count) break;
    }
  }

  return result;
}

export function countDueFactsV3(facts: FactFamily[], now = Date.now()): number {
  return facts.filter(
    (f) => f.totalAttempts > 0 && (f.dueDate <= now || f.repetitions === 0)
  ).length;
}

export function downloadProfileBackupV3(profile: UserProfileV3): void {
  if (typeof window === 'undefined') return;
  const exportData = {
    format: 'zahlenblitz_profile_backup_v3',
    version: 3,
    exportedAt: new Date().toISOString(),
    profile,
  };
  const jsonStr = JSON.stringify(exportData, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const safeName =
    profile.name
      .toLowerCase()
      .replace(/[^a-z0-9äöüß_-]/gi, '_')
      .replace(/_+/g, '_') || 'spieler';
  const dateStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `zahlenblitz_v3_profil_${safeName}_${dateStr}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
