import type {
  FactFamily,
  FactVisualStatus,
  GameMode,
  MasteryStatus,
  TaskVariant,
} from './types';

export const DAY_MS = 24 * 60 * 60 * 1000;
export const MIN_EASE_FACTOR = 1.3;
export const MAX_EASE_FACTOR = 3.2;

// Kindgerechte Schwellenwerte inklusive Lesezeit und Motorik auf dem Ziffernblock:
// 1. Klasse (Zahlen-Held): Bis 5,0 Sekunden = Automatisiert / Blitz-Tempo (q = 4)
// 2./3. Klasse (1x1 Meister): Bis 4,0 Sekunden = Automatisiert / Blitz-Tempo (q = 4)
// Bis 12,0 Sekunden: Sicher gelöst / Gutes Tempo (q = 3)
// Über 12,0 Sekunden: Ausgerechnet / Zögernd (q = 2, OHNE Ease-Abzug!)
export const FAST_THRESHOLD_PM_MS = 5000;
export const FAST_THRESHOLD_MULT_MS = 4000;
export const FAST_THRESHOLD_MS = 4000;
export const GOOD_THRESHOLD_MS = 12000;

export interface SM2FactEvaluationResult {
  updatedFact: FactFamily;
  quality: 0 | 2 | 3 | 4;
  starsEarned: number;
  feedbackTitle: string;
  feedbackSubtitle: string;
}

/**
 * Erkennt Inversionsfehler (Zahlendreher), z. B. 31 statt 13 oder 65 statt 56.
 * Im Deutschen werden Zehner und Einer invertiert gesprochen ("drei-zehn", "fünf-und-fünfzig"),
 * weshalb Grundschulkinder häufig die Einerstelle zuerst tippen.
 */
export function isDigitReversal(userAnswer: number, solution: number): boolean {
  if (userAnswer === solution) return false;
  const u = userAnswer.toString();
  const s = solution.toString();
  return u.length === 2 && s.length === 2 && u[0] === s[1] && u[1] === s[0];
}

export function evaluateResponseQuality(
  isCorrect: boolean,
  responseTimeMs: number,
  mode: GameMode = 'mult'
): 0 | 2 | 3 | 4 {
  if (!isCorrect) return 0;
  const fastThreshold = mode === 'plusminus' ? FAST_THRESHOLD_PM_MS : FAST_THRESHOLD_MULT_MS;
  if (responseTimeMs <= fastThreshold) return 4;
  if (responseTimeMs <= GOOD_THRESHOLD_MS) return 3;
  return 2;
}

/**
 * Aktualisiert eine Faktenfamilie nach dem kindgerecht modifizierten SM-2-Algorithmus.
 * Wichtigster didaktischer Unterschied zu Standard-SM-2:
 * 1. Richtige Antworten, die länger als 12 Sekunden dauern (q = 2), werden NICHT mit
 *    sinkendem Ease-Faktor bestraft. Denn sorgfältiges Rechnen ist in der Grundschule
 *    ein Erfolg und kein Versagen.
 * 2. Zahlendreher (Inversionsfehler) erhalten nur einen minimalen Ease-Abzug (-0.05 statt -0.20),
 *    da die mathematische Zerlegung verstanden wurde und nur die Ziffernreihenfolge vertauscht war.
 */
export function applySM2ToFact(
  fact: FactFamily,
  variant: TaskVariant,
  isCorrect: boolean,
  responseTimeMs: number,
  now: number = Date.now(),
  isReversal = false
): SM2FactEvaluationResult {
  const quality = evaluateResponseQuality(isCorrect, responseTimeMs, fact.mode);
  const secondsStr = (responseTimeMs / 1000).toFixed(1).replace('.', ',');

  if (quality === 0) {
    // Fehler: repetitions wird zurückgesetzt, Fälligkeit sofort
    // Zahlendreher werden didaktisch verzeihend bewertet (nur -0.05 Ease)
    const easeDeduction = isReversal ? 0.05 : 0.2;
    const newEase = Math.max(
      MIN_EASE_FACTOR,
      Number((fact.easeFactor - easeDeduction).toFixed(2))
    );
    const updatedFact: FactFamily = {
      ...fact,
      repetitions: 0,
      interval: 0,
      easeFactor: newEase,
      dueDate: now,
      lastQuality: 0,
      lastResponseMs: Math.round(responseTimeMs),
      totalAttempts: fact.totalAttempts + 1,
    };

    return {
      updatedFact,
      quality: 0,
      starsEarned: 0,
      feedbackTitle: isReversal ? 'Fast! Zahlendreher 🔄' : 'Schau dir die Lösung an:',
      feedbackSubtitle: isReversal
        ? 'Erst Zehner, dann Einer! Am Rundenende gleich noch einmal.'
        : 'Die Aufgabe kommt am Ende der Runde noch einmal zur Festigung dran.',
    };
  }

  const nextRepetitions = fact.repetitions + 1;
  let nextEase = fact.easeFactor;
  let nextInterval = 1;
  let starsEarned = 1;
  let feedbackTitle = 'Super gelöst!';
  let feedbackSubtitle = `Gelöst in ${secondsStr} Sekunden (+1 ⭐)`;

  if (quality === 4) {
    // Blitzschnell automatisiert (<= 6 s)
    nextEase = Math.min(
      MAX_EASE_FACTOR,
      Number((fact.easeFactor + 0.15).toFixed(2))
    );
    if (nextRepetitions === 1) {
      nextInterval = 2;
    } else if (nextRepetitions === 2) {
      nextInterval = 6;
    } else {
      nextInterval = Math.min(180, Math.round(fact.interval * nextEase * 1.3));
    }
    starsEarned = 2;
    feedbackTitle = 'Blitzschnell! ⚡';
    feedbackSubtitle = `Automatisiert in ${secondsStr} s (+2 ⭐)`;
  } else if (quality === 3) {
    // Gutes Tempo (6 s – 12 s)
    nextEase = Number(fact.easeFactor.toFixed(2));
    if (nextRepetitions === 1) {
      nextInterval = 1;
    } else if (nextRepetitions === 2) {
      nextInterval = 3;
    } else {
      nextInterval = Math.min(180, Math.round(fact.interval * nextEase));
    }
    starsEarned = 1;
    feedbackTitle = 'Klasse gemacht! 👍';
    feedbackSubtitle = `Sicher gelöst in ${secondsStr} s (+1 ⭐)`;
  } else {
    // Gerechnet (> 12 s): Intervall wächst moderat, Ease-Faktor bleibt stabil
    nextEase = Number(fact.easeFactor.toFixed(2));
    if (nextRepetitions === 1) {
      nextInterval = 1;
    } else if (nextRepetitions === 2) {
      nextInterval = 2;
    } else {
      nextInterval = Math.min(180, Math.max(1, Math.round(fact.interval * 1.2)));
    }
    starsEarned = 1;
    feedbackTitle = 'Richtig ausgerechnet! 🧠';
    feedbackSubtitle = `Erfolgreich gerechnet in ${secondsStr} s (+1 ⭐)`;
  }

  const nextDueDate = Math.round(now + nextInterval * DAY_MS);

  // Transferform als gemeistert markieren, wenn quality >= 3
  const nextMastered = [...fact.masteredVariants];
  if (quality >= 3 && !nextMastered.includes(variant)) {
    nextMastered.push(variant);
  }

  const updatedFact: FactFamily = {
    ...fact,
    repetitions: nextRepetitions,
    easeFactor: nextEase,
    interval: nextInterval,
    dueDate: nextDueDate,
    lastQuality: quality,
    lastResponseMs: Math.round(responseTimeMs),
    totalAttempts: fact.totalAttempts + 1,
    correctAttempts: fact.correctAttempts + 1,
    masteredVariants: nextMastered,
  };

  return {
    updatedFact,
    quality,
    starsEarned,
    feedbackTitle,
    feedbackSubtitle,
  };
}

/**
 * Bestimmt den differenzierten didaktischen Status für Matrix und Heatmap:
 * - 3 Grün-Stufen: Grundaufgabe (Hellgrün) → Umkehrung (Mittelgrün) → Lücke (Dunkelgrün)
 * - 2 Rot-Stufen: Soft-Fehler (Rosa) vs. Echter Wackelkandidat (Dunkelrot)
 * - Gelb: 1x richtig gelöst, im Lernprozess
 * - 👑 Krone: Alle 3 Stufen gemeistert UND Spaced-Repetition-Intervall >= 14 Tage!
 */
export function getFactVisualStatus(fact: FactFamily): FactVisualStatus {
  if (fact.totalAttempts === 0) {
    return {
      level: 'fresh',
      hasCrown: false,
      label: 'Neu',
      badge: '⚪',
      shortDesc: 'Noch nie geübt',
    };
  }

  // Fehler-Status
  if (fact.repetitions === 0 || fact.lastQuality === 0) {
    const mistakeCount = fact.totalAttempts - fact.correctAttempts;
    const isHard =
      (mistakeCount >= 2 && fact.correctAttempts / fact.totalAttempts < 0.65) ||
      fact.easeFactor < 2.0;

    if (isHard) {
      return {
        level: 'wrong_hard',
        hasCrown: false,
        label: 'Wackelkandidat',
        badge: '🚨',
        shortDesc: 'Mehrfach unsicher – gezielt wiederholen',
      };
    }

    return {
      level: 'wrong_soft',
      hasCrown: false,
      label: 'Wiederholen',
      badge: '🌸',
      shortDesc: 'Kürzlicher Fehler oder Vertipper',
    };
  }

  // Prüfung auf gemeisterte Transfervarianten
  const isMult = fact.mode === 'mult';
  const hasInverse = fact.masteredVariants.includes(isMult ? 'div' : 'sub');
  const hasGap = fact.masteredVariants.some((v) => v.startsWith('gap_'));

  // Krone 👑: Alle 3 Stufen (Grundaufgabe, Umkehrung, Lücke) UND Spaced-Repetition-Intervall >= 14 Tage
  const hasCrown = hasInverse && hasGap && fact.interval >= 14;

  if (hasGap) {
    return {
      level: 'green_step3',
      hasCrown,
      label: hasCrown ? 'Langzeit-Meister 👑' : 'Meister-Können',
      badge: hasCrown ? '👑' : '🟢',
      shortDesc: hasCrown
        ? 'Im Langzeitgedächtnis verankert (inkl. Lückenaufgabe)!'
        : 'Stufe 3: Auch Lückenaufgaben gemeistert!',
    };
  }

  if (hasInverse) {
    return {
      level: 'green_step2',
      hasCrown: false,
      label: 'Umkehr-Können',
      badge: '🟢',
      shortDesc: 'Stufe 2: Geteilt- bzw. Minusaufgabe gemeistert!',
    };
  }

  if (fact.repetitions >= 2 || (fact.lastQuality ?? 0) >= 3) {
    return {
      level: 'green_step1',
      hasCrown: false,
      label: 'Basis-Können',
      badge: '🟢',
      shortDesc: 'Stufe 1: Grundaufgabe sitzt sicher!',
    };
  }

  return {
    level: 'learning',
    hasCrown: false,
    label: 'Im Lernen',
    badge: '🟡',
    shortDesc: 'Erste richtige Lösung, wird aktuell gefestigt',
  };
}

/**
 * Kompatibilitäts-Funktion für übergeordnete Filter
 */
export function getFactMastery(fact: FactFamily): MasteryStatus {
  const vis = getFactVisualStatus(fact);
  if (vis.level === 'fresh') return 'new';
  if (vis.level === 'wrong_soft' || vis.level === 'wrong_hard') return 'wrong';
  if (vis.level === 'green_step2' || vis.level === 'green_step3' || vis.hasCrown) return 'mastered';
  return 'learning';
}
