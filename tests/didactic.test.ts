import assert from 'node:assert';
import {
  classifyStrategyMult,
  classifyStrategyPM,
  formatEquationPartsV3,
  formatPracticeOperationsLabel,
  generateMultFacts,
  generatePlusMinusFacts,
  normalizePracticeOperations,
  selectTaskVariant,
} from '../src/v3/lib/generator';
import {
  buildChapterSessionQueueV3,
  getAccessibleFactsPoolV3,
  getFactWorld,
  getWorldChaptersV3,
} from '../src/v3/lib/chapters';
import { applySM2ToFact, evaluateResponseQuality, getFactVisualStatus, isDigitReversal } from '../src/v3/lib/sm2';
import type { FactFamily } from '../src/v3/lib/types';

console.log('=== START DIDACTIC TESTS V3 ===');

// --- TEST 1: Fakten-Vollständigkeit & Klassifikation ---
const pmFacts = generatePlusMinusFacts();
assert.strictEqual(pmFacts.length, 100, 'Zahlen-Held muss exakt 100 Fakten haben');

const multFacts = generateMultFacts();
assert.strictEqual(multFacts.length, 100, '1x1 Meister muss exakt 100 Fakten haben');

// Prüfe die 24 vormals fehlenden Fakten
const missingSample = [
  [3, 1, 4], [4, 1, 5], [5, 1, 6], [6, 1, 7], [7, 1, 8], [8, 1, 9],
  [4, 2, 6], [5, 2, 7], [6, 2, 8], [7, 2, 9], [1, 3, 4], [5, 3, 8],
  [6, 3, 9], [1, 4, 5], [2, 4, 6], [1, 5, 6], [2, 5, 7], [3, 5, 8],
  [1, 6, 7], [2, 6, 8], [3, 6, 9], [1, 7, 8], [2, 7, 9], [1, 8, 9]
];

for (const [a, b, c] of missingSample) {
  const fact = pmFacts.find(f => f.a === a && f.b === b);
  assert.ok(fact, `Fakt ${a}+${b}=${c} muss in pmFacts existieren`);
  if (fact) {
    assert.strictEqual(fact.c, c, `Ergebnis von ${a}+${b} muss ${c} sein`);
    assert.strictEqual(fact.strategy, 'up_to_10', `Fakt ${a}+${b}=${c} muss strategy 'up_to_10' sein`);
  }
}
console.log('✓ Test 1 bestanden: 100 Fakten pro Modus & alle 24 ehemals fehlenden Aufgaben vorhanden.');

// --- TEST 2: Lückenlose Zuordnung zu den 3 Welten ---
const pmChapters = getWorldChaptersV3(pmFacts, 'plusminus');
assert.strictEqual(pmChapters.length, 3, 'Es müssen genau 3 Welten sein');

const ch1Facts = pmChapters[0].facts;
const ch2Facts = pmChapters[1].facts;
const ch3Facts = pmChapters[2].facts;

// Welt 1: Alle mit Summe <= 10 (müssen exakt 45 Fakten sein: 9+8+7+6+5+4+3+2+1)
assert.strictEqual(ch1Facts.length, 45, 'Welt 1 (Summe <= 10) muss exakt 45 Fakten enthalten');
for (const [a, b, c] of missingSample) {
  assert.ok(ch1Facts.some(f => f.a === a && f.b === b), `Fakt ${a}+${b}=${c} muss in Welt 1 enthalten sein`);
}

// Welt 2: Verdoppeln, Nachbarn und Zehnerbündel (10 + x / x + 10) bis 20
// Verdopplungen > 10: 6+6, 7+7, 8+8, 9+9, 10+10 (5 Fakten)
// Nachbarn > 10: 5+6, 6+5, 6+7, 7+6, 7+8, 8+7, 8+9, 9+8, 9+10, 10+9 (10 Fakten)
// Zehnerbündel 10+x / x+10 (ohne Dopplung zu 10+10 und 9+10/10+9): 16 Fakten
// In Summe 31 Fakten
assert.strictEqual(ch2Facts.length, 31, 'Welt 2 muss exakt 31 Fakten enthalten');

// Welt 3: Echter Zehnerübergang ohne 10er-Bündel (24 Fakten)
assert.strictEqual(ch3Facts.length, 24, 'Welt 3 muss exakt 24 Fakten enthalten');

// Gesamt-Check: 45 + 31 + 24 = 100!
assert.strictEqual(ch1Facts.length + ch2Facts.length + ch3Facts.length, 100, 'Alle 100 Fakten müssen abgedeckt sein');
console.log('✓ Test 2 bestanden: Alle 100 Fakten lückenlos in den 3 Rechenwelten.');

// --- TEST 3: Explizite Rechenart-Auswahl & Kindgerechte Lückenaufgaben ---
const masteredPmFact: FactFamily = {
  ...pmFacts[0],
  repetitions: 10,
  masteredVariants: ['add'],
};
for (let i = 0; i < 100; i++) {
  assert.strictEqual(
    selectTaskVariant(masteredPmFact),
    'add',
    'Default selectTaskVariant muss immer add liefern (kein automatisches Eskalieren!)'
  );
  assert.strictEqual(
    selectTaskVariant(masteredPmFact, 'base'),
    'add',
    'Bei operation=base muss selbst bei repetitions=10 immer add kommen'
  );
  assert.strictEqual(
    selectTaskVariant({ ...pmFacts[0], repetitions: 0 }, 'inverse'),
    'sub',
    'Bei operation=inverse muss auch bei repetitions=0 direkt sub kommen'
  );
  const gapPm = selectTaskVariant(masteredPmFact, 'gap');
  assert.strictEqual(
    gapPm,
    'gap_add_b',
    `Bei operation=gap darf NUR gap_add_b kommen (keine Minus-Lücken!), erhalten: ${gapPm}`
  );
  const task = formatEquationPartsV3(masteredPmFact, gapPm);
  assert.ok(!task.prompt.startsWith('?'), `Prompt darf nicht mit ? beginnen: ${task.prompt}`);
}

let sawMixAdd = false;
let sawMixSub = false;
for (let i = 0; i < 500; i++) {
  const v = selectTaskVariant(masteredPmFact, 'mix');
  assert.ok(v === 'add' || v === 'sub', `Bei mix darf niemals eine Lückenaufgabe kommen: ${v}`);
  if (v === 'add') sawMixAdd = true;
  if (v === 'sub') sawMixSub = true;
}
assert.ok(sawMixAdd && sawMixSub, 'Bei mix müssen add und sub vorkommen');

const masteredMultFact: FactFamily = {
  ...multFacts[0],
  repetitions: 10,
  masteredVariants: ['mult'],
};
for (let i = 0; i < 100; i++) {
  assert.strictEqual(
    selectTaskVariant(masteredMultFact, 'base'),
    'mult',
    'Bei 1x1 operation=base muss immer mult kommen'
  );
  assert.strictEqual(
    selectTaskVariant({ ...multFacts[0], repetitions: 0 }, 'inverse'),
    'div',
    'Bei 1x1 operation=inverse muss immer div kommen'
  );
  const gapMult = selectTaskVariant(masteredMultFact, 'gap');
  assert.strictEqual(
    gapMult,
    'gap_mult_b',
    `Bei 1x1 operation=gap darf NUR gap_mult_b kommen (keine Geteilt-Lücken!), erhalten: ${gapMult}`
  );
  const task = formatEquationPartsV3(masteredMultFact, gapMult);
  assert.ok(!task.prompt.startsWith('?'), `Prompt darf nicht mit ? beginnen: ${task.prompt}`);
}

let sawMixMult = false;
let sawMixDiv = false;
for (let i = 0; i < 500; i++) {
  const v = selectTaskVariant(masteredMultFact, 'mix');
  assert.ok(v === 'mult' || v === 'div', `Bei 1x1 mix darf niemals eine Lücke kommen: ${v}`);
  if (v === 'mult') sawMixMult = true;
  if (v === 'div') sawMixDiv = true;
}
assert.ok(sawMixMult && sawMixDiv, 'Bei 1x1 mix müssen mult und div vorkommen');

// Kombinierbare Mehrfach-Auswahl (3 Toggles: base, inverse, gap)
assert.deepStrictEqual(normalizePracticeOperations('mix'), ['base', 'inverse']);
assert.deepStrictEqual(normalizePracticeOperations([]), ['base'], 'Leeres Array fällt sicher auf base zurück');
assert.strictEqual(
  formatPracticeOperationsLabel(['base', 'gap'], 'plusminus'),
  'Plus & Lücken',
  'Label für Plus + Lücken muss passen'
);
assert.strictEqual(
  formatPracticeOperationsLabel(['base', 'inverse', 'gap'], 'mult'),
  'Mal, Geteilt & Lücken',
  'Label für alle 3 Modi im 1x1 muss passen'
);
const sawBaseGap = new Set<string>();
for (let i = 0; i < 300; i++) {
  const v = selectTaskVariant(masteredPmFact, ['base', 'gap']);
  assert.ok(v === 'add' || v === 'gap_add_b', `Plus+Lücken darf niemals sub liefern: ${v}`);
  sawBaseGap.add(v);
}
assert.ok(sawBaseGap.has('add') && sawBaseGap.has('gap_add_b'), 'Plus+Lücken muss beide liefern');

const sawAll3 = new Set<string>();
for (let i = 0; i < 500; i++) {
  const v = selectTaskVariant(masteredMultFact, ['base', 'inverse', 'gap']);
  assert.ok(v === 'mult' || v === 'div' || v === 'gap_mult_b', `Unerwartete Variante: ${v}`);
  sawAll3.add(v);
}
assert.ok(
  sawAll3.has('mult') && sawAll3.has('div') && sawAll3.has('gap_mult_b'),
  'Alle 3 kombinierten Modi müssen mult, div und gap_mult_b liefern'
);
console.log('✓ Test 3 bestanden: Explizite Rechenart-Auswahl & freie 3-Toggle-Kombination funktionieren ohne Überforderung.');

// --- TEST 4: SM-2 Engine & Differenzierte Zeitfenster (1x1: 4s vs. PlusMinus: 5s) ---
// 1x1 Meister (mult)
assert.strictEqual(evaluateResponseQuality(true, 3999, 'mult'), 4, '1x1: < 4s ist q=4 (Blitzschnell)');
assert.strictEqual(evaluateResponseQuality(true, 4000, 'mult'), 4, '1x1: 4.0s ist q=4 (Blitzschnell)');
assert.strictEqual(evaluateResponseQuality(true, 4001, 'mult'), 3, '1x1: 4.001s ist q=3 (Sicher gelöst)');
assert.strictEqual(evaluateResponseQuality(true, 11999, 'mult'), 3, '1x1: < 12s ist q=3 (Sicher gelöst)');
assert.strictEqual(evaluateResponseQuality(true, 13500, 'mult'), 2, '1x1: > 12s ist q=2 (Ausgerechnet)');

// Zahlen-Held (plusminus: 5s Schwellenwert)
assert.strictEqual(evaluateResponseQuality(true, 4999, 'plusminus'), 4, 'PM: < 5s ist q=4 (Blitzschnell)');
assert.strictEqual(evaluateResponseQuality(true, 5000, 'plusminus'), 4, 'PM: 5.0s ist q=4 (Blitzschnell)');
assert.strictEqual(evaluateResponseQuality(true, 5001, 'plusminus'), 3, 'PM: 5.001s ist q=3 (Sicher gelöst)');
assert.strictEqual(evaluateResponseQuality(true, 11999, 'plusminus'), 3, 'PM: < 12s ist q=3 (Sicher gelöst)');
assert.strictEqual(evaluateResponseQuality(true, 13500, 'plusminus'), 2, 'PM: > 12s ist q=2 (Ausgerechnet)');
assert.strictEqual(evaluateResponseQuality(false, 3000), 0, 'Falsch ist immer q=0');

// Inversionsfehler / Zahlendreher (31 statt 13 oder 65 statt 56)
assert.strictEqual(isDigitReversal(31, 13), true, '31 vs 13 ist ein Zahlendreher');
assert.strictEqual(isDigitReversal(65, 56), true, '65 vs 56 ist ein Zahlendreher');
assert.strictEqual(isDigitReversal(12, 12), false, 'Gleiche Zahl ist kein Zahlendreher');
assert.strictEqual(isDigitReversal(14, 15), false, '14 vs 15 ist kein Zahlendreher');

// Prüfe: Keine Ease-Bestrafung bei q = 2
const slowResult = applySM2ToFact(pmFacts[0], 'add', true, 14000);
assert.strictEqual(slowResult.quality, 2);
assert.strictEqual(slowResult.updatedFact.easeFactor, pmFacts[0].easeFactor, 'Ease Factor darf bei q=2 NICHT sinken!');
assert.strictEqual(slowResult.starsEarned, 1, 'Langsame richtige Antwort gibt trotzdem 1 Stern');

// Prüfe: Regulärer Fehler verringert Ease um 0.20
const failResult = applySM2ToFact(pmFacts[0], 'add', false, 3000);
assert.strictEqual(failResult.quality, 0);
assert.strictEqual(failResult.updatedFact.repetitions, 0);
assert.strictEqual(failResult.updatedFact.interval, 0);
assert.strictEqual(failResult.updatedFact.easeFactor, Number((pmFacts[0].easeFactor - 0.2).toFixed(2)), 'Regulärer Fehler zieht 0.20 Ease ab');

// Prüfe: Zahlendreher verringert Ease nur minimal um 0.05
const revResult = applySM2ToFact(pmFacts[0], 'add', false, 3000, Date.now(), true);
assert.strictEqual(revResult.quality, 0);
assert.strictEqual(revResult.updatedFact.repetitions, 0);
assert.strictEqual(revResult.updatedFact.easeFactor, Number((pmFacts[0].easeFactor - 0.05).toFixed(2)), 'Zahlendreher zieht nur 0.05 Ease ab');
assert.ok(revResult.feedbackTitle.includes('Zahlendreher'), 'Feedback-Titel muss Zahlendreher erwähnen');

console.log('✓ Test 4 bestanden: SM-2 Engine bewertet fair, differenziert Zeitfenster nach Klassenstufe und fängt Zahlendreher ab.');

// --- TEST 5: Didaktischer Welten-Schutz (Curriculum Progression Guard) ---
import {
  buildDailySessionQueueV3,
  buildRowSessionQueueV3,
  getWeakSpotFactsV3,
  buildWeakSpotsSessionQueueV3,
  buildBlitzChallengeQueueV3,
} from '../src/v3/lib/storage';

// Frischer Fakten-Satz: Keine Welt freigespielt (nur Welt 1 aktiv)
const freshMultFacts = generateMultFacts();
const { accessibleFacts: freshAccessible, unlockedWorldCount: freshCount } =
  getAccessibleFactsPoolV3(freshMultFacts, 'mult');
assert.strictEqual(freshCount, 1, 'Bei ungespieltem Stand darf nur Welt 1 freigeschaltet sein');

// Prüfe: Erste Runde an Tag 1 muss einen ausgewogenen Mix aus 2er, 5er, 10er und 1er Reihe enthalten!
const firstQueue = buildDailySessionQueueV3(freshMultFacts, 10);
assert.strictEqual(firstQueue.length, 10, 'Queue muss 10 Aufgaben haben');
const has2InFirst = firstQueue.some((t) => t.fact.a === 2 || t.fact.b === 2);
const has5InFirst = firstQueue.some((t) => t.fact.a === 5 || t.fact.b === 5);
const has10InFirst = firstQueue.some((t) => t.fact.a === 10 || t.fact.b === 10);
const has1InFirst = firstQueue.some((t) => t.fact.a === 1 || t.fact.b === 1);
assert.ok(has2InFirst, 'In der ersten Runde Welt 1 MUSS die 2er-Reihe (Verdoppeln) vertreten sein');
assert.ok(has5InFirst, 'In der ersten Runde Welt 1 MUSS die 5er-Reihe vertreten sein');
assert.ok(has10InFirst || has1InFirst, 'In der ersten Runde Welt 1 MUSS auch die 10er- oder 1er-Reihe vertreten sein');

// Mehrfache Tages-Missionen an Tag 1 simulieren
for (let round = 0; round < 5; round++) {
  const queue = buildDailySessionQueueV3(freshMultFacts, 10);
  assert.strictEqual(queue.length, 10, 'Queue muss 10 Aufgaben haben');
  for (const item of queue) {
    // Prüfe: Keine Königsaufgabe (7, 8, 9) darf vorkommen!
    const isForbiddenKing =
      [7, 8, 9].includes(item.fact.a) && [7, 8, 9].includes(item.fact.b);
    assert.strictEqual(
      isForbiddenKing,
      false,
      `Welten-Schutz verletzt: Fakt ${item.fact.a}x${item.fact.b} aus Welt 3 darf an Tag 1 nicht vorkommen!`
    );
    // Prüfe: Geteilt-Aufgaben dürfen erst kommen, wenn alle Malaufgaben der Welt sitzen
    assert.strictEqual(item.variant, 'mult', 'Bei unvollständiger Welt 1 darf nur die Grundaufgabe mult kommen');
  }
}

// Prüfe: Freie Weltenwahl schaltet für Eltern alle 3 Welten und alle 100 Fakten frei
const { accessibleFacts: freePool, unlockedWorldCount: freeCount } =
  getAccessibleFactsPoolV3(freshMultFacts, 'mult', true);
assert.strictEqual(freeCount, 3, 'Bei freier Weltenwahl müssen alle 3 Welten freigeschaltet sein');
assert.strictEqual(freePool.length, 100, 'Bei freier Weltenwahl müssen alle 100 Fakten zugänglich sein');

// Prüfe: Bei freier Weltenwahl zieht die Tages-Mission sofort Aufgaben aus allen Welten (auch Welt 2 und 3!)
const freeDailyQueue = buildDailySessionQueueV3(freshMultFacts, 10, Date.now(), true);
assert.strictEqual(freeDailyQueue.length, 10, 'Free daily queue muss 10 Aufgaben haben');
const worldsInFreeQueue = new Set(freeDailyQueue.map((item) => {
  if (item.fact.a === 1 || item.fact.a === 2 || item.fact.a === 5 || item.fact.a === 10 ||
      item.fact.b === 1 || item.fact.b === 2 || item.fact.b === 5 || item.fact.b === 10) return 1;
  if (item.fact.a === 3 || item.fact.a === 4 || item.fact.b === 3 || item.fact.b === 4) return 2;
  return 3;
}));
assert.ok(worldsInFreeQueue.has(2) || worldsInFreeQueue.has(3), 'Bei freier Weltenwahl müssen auch Welt 2 oder 3 in der Tages-Mission vorkommen');

// Prüfe: Gezieltes Reihen-Training (z. B. 7er-Reihe bei 1x1 und 5er-Reihe bei Zahlen-Held)
const row7Queue = buildRowSessionQueueV3(freshMultFacts, 7, 10);
assert.strictEqual(row7Queue.length, 10, '7er-Reihe Queue muss 10 Aufgaben liefern');
for (const item of row7Queue) {
  assert.ok(item.fact.a === 7 || item.fact.b === 7, `Jede Aufgabe der 7er-Reihe muss a=7 oder b=7 enthalten: ${item.fact.a}x${item.fact.b}`);
}

const row5PMQueue = buildRowSessionQueueV3(pmFacts, 5, 10);
assert.strictEqual(row5PMQueue.length, 10, '5er-Reihe PM Queue muss 10 Aufgaben liefern');
for (const item of row5PMQueue) {
  assert.ok(item.fact.a === 5 || item.fact.b === 5, `Jede Aufgabe der 5er-Reihe muss a=5 oder b=5 enthalten: ${item.fact.a}+${item.fact.b}`);
}

// Prüfe: Welt 1 vollständig gemeistert (Welt 2 ist freigeschaltet), inkl. fälliger Fakten in Welt 2/3!
// Trotz freigeschalteter Welt 2 darf worldScope=1 + operation='base' Weder Welt 2/3 leaken noch Minus/Lücken aufzwingen!
const pmWorld1Mastered = generatePlusMinusFacts().map((f) => {
  const w = getFactWorld(f);
  if (w === 1) {
    return {
      ...f,
      totalAttempts: 4,
      correctAttempts: 4,
      repetitions: 3,
      interval: 6,
      dueDate: Date.now() + 86400000,
      lastQuality: 4 as const,
      masteredVariants: ['add' as const],
    };
  }
  // Fällige Fakten in Welt 2/3 simulieren (z. B. nach vorherigem Testlauf)
  return {
    ...f,
    totalAttempts: 2,
    correctAttempts: 1,
    repetitions: 0,
    dueDate: Date.now() - 1000,
    lastQuality: 0 as const,
    masteredVariants: [],
  };
});

const { unlockedWorldCount: pmUnlocked } = getAccessibleFactsPoolV3(pmWorld1Mastered, 'plusminus');
assert.strictEqual(pmUnlocked, 2, 'Nach Welt 1 Hellgrün muss Welt 2 freigeschaltet sein');

const stayInWorld1Queue = buildDailySessionQueueV3(pmWorld1Mastered, 10, Date.now(), false, 'base', 1);
assert.strictEqual(stayInWorld1Queue.length, 10, 'Stay-in-World-1 Queue muss 10 Aufgaben liefern');
for (const item of stayInWorld1Queue) {
  assert.strictEqual(getFactWorld(item.fact), 1, `Welt 1 darf keine Welt-2/3-Aufgaben (auch nicht fällige) mischen: ${item.fact.id}`);
  assert.strictEqual(item.variant, 'add', `Bei operation=base muss strikt add kommen, erhalten: ${item.variant}`);
}

const optInWorld2Queue = buildDailySessionQueueV3(pmWorld1Mastered, 10, Date.now(), false, 'base', 2);
assert.strictEqual(optInWorld2Queue.length, 10, 'Opt-in Welt 2 Queue muss 10 Aufgaben liefern');
for (const item of optInWorld2Queue) {
  assert.strictEqual(getFactWorld(item.fact), 2, `Bei worldScope=2 dürfen nur Welt-2-Fakten kommen: ${item.fact.id}`);
  assert.strictEqual(item.variant, 'add', `Bei operation=base in Welt 2 muss strikt add kommen: ${item.variant}`);
}

// Clamping-Schutz: Wenn Welt 3 gesperrt ist (freshMultFacts -> unlockedWorldCount === 1), clampt worldScope=3 sicher auf Welt 1
const clampedQueue = buildDailySessionQueueV3(freshMultFacts, 10, Date.now(), false, 'base', 3);
for (const item of clampedQueue) {
  assert.strictEqual(getFactWorld(item.fact), 1, `Gesperrte Welt 3 muss auf Welt 1 geclampt werden: ${item.fact.id}`);
}

// Minus-Modus auf Basis gemeisterter Plus-Fakten: bevorzugt Fakten ohne 'sub' in masteredVariants und liefert strikt 'sub'
const inverseQueue = buildDailySessionQueueV3(pmWorld1Mastered, 10, Date.now(), false, 'inverse', 1);
assert.strictEqual(inverseQueue.length, 10);
for (const item of inverseQueue) {
  assert.strictEqual(getFactWorld(item.fact), 1);
  assert.strictEqual(item.variant, 'sub', `Bei operation=inverse muss strikt sub kommen: ${item.variant}`);
}

// Kapitel-, Reihen-, Wackelkandidaten- und Blitz-Queue dürfen ebenfalls NICHT eskalieren bei operation='base'
const pmChaptersFull = getWorldChaptersV3(
  pmWorld1Mastered.map((f) =>
    getFactWorld(f) === 1 ? { ...f, masteredVariants: ['add', 'sub', 'gap_add_b'] } : f
  ),
  'plusminus'
);
assert.ok(pmChaptersFull[0].stars >= 2, 'Welt 1 Kapitel hat hier mindestens 2 Sterne');
const chapterBaseQueue = buildChapterSessionQueueV3(pmChaptersFull[0], 10, 'base');
for (const item of chapterBaseQueue) {
  assert.strictEqual(item.variant, 'add', 'buildChapterSessionQueueV3 darf trotz Sternen bei operation=base nur add liefern');
}

const rowBaseQueue = buildRowSessionQueueV3(pmWorld1Mastered, 5, 10, 'base');
for (const item of rowBaseQueue) {
  assert.strictEqual(item.variant, 'add', 'buildRowSessionQueueV3 darf bei operation=base nur add liefern');
}

console.log('✓ Test 5 bestanden: Welten-Isolation, explizite Rechenart-Treue, freie Weltenwahl & Reihen-Training funktionieren.');

// --- TEST 6: Wackelkandidaten & 60s Blitz-Challenge ---
const factsWithFlaws = generateMultFacts().map((f, i) => {
  if (i === 0) return { ...f, totalAttempts: 2, lastQuality: 0 as const, repetitions: 0 };
  if (i === 1) return { ...f, totalAttempts: 3, lastResponseMs: 9500, repetitions: 1 };
  if (i === 2) return { ...f, totalAttempts: 4, correctAttempts: 1, easeFactor: 1.8, repetitions: 1 };
  return f;
});

const weakSpots = getWeakSpotFactsV3(factsWithFlaws);
assert.ok(weakSpots.length >= 3, 'Mindestens 3 Wackelkandidaten müssen erkannt werden');
assert.strictEqual(weakSpots[0].id, factsWithFlaws[0].id, 'Akuter Fehler muss an Position 1 stehen');

const weakQueue = buildWeakSpotsSessionQueueV3(factsWithFlaws, 10, 'base');
assert.strictEqual(weakQueue.length, 10, 'Wackelkandidaten-Queue muss 10 Aufgaben liefern');
for (const item of weakQueue) {
  assert.strictEqual(item.variant, 'mult', 'Wackelkandidaten mit operation=base liefern nur mult');
}

const blitzQueue = buildBlitzChallengeQueueV3(factsWithFlaws, 60, false, 'base', 1);
assert.strictEqual(blitzQueue.length, 60, 'Blitz-Queue muss 60 Aufgaben für den 60s Sprint liefern');
for (const item of blitzQueue) {
  assert.strictEqual(getFactWorld(item.fact), 1, 'Blitz mit worldScope=1 bleibt strikt in Welt 1');
  assert.strictEqual(item.variant, 'mult', 'Blitz mit operation=base liefert nur mult');
}
console.log('✓ Test 6 bestanden: Wackelkandidaten-Trainer & 60s Blitz-Challenge respektieren Rechenart & Welt.');

// --- TEST 7: Farbmetrik & Visueller Status (3 Grün-Stufen, 2 Rot-Stufen, Krone) ---
const baseFact = multFacts[0]; // 1x1=1

// Fall 1: Neu
const visFresh = getFactVisualStatus(baseFact);
assert.strictEqual(visFresh.level, 'fresh');
assert.strictEqual(visFresh.hasCrown, false);

// Fall 2: Im Lernen (1 richtiger Versuch)
const visLearning = getFactVisualStatus({
  ...baseFact,
  totalAttempts: 1,
  correctAttempts: 1,
  repetitions: 1,
  interval: 1,
});
assert.strictEqual(visLearning.level, 'learning');
assert.strictEqual(visLearning.hasCrown, false);

// Fall 3: Stufe 1 (Hellgrün - Grundaufgabe)
const visStep1 = getFactVisualStatus({
  ...baseFact,
  totalAttempts: 3,
  correctAttempts: 3,
  repetitions: 3,
  interval: 6,
  masteredVariants: ['mult'],
});
assert.strictEqual(visStep1.level, 'green_step1');
assert.strictEqual(visStep1.hasCrown, false);
assert.strictEqual(visStep1.badge, '🟢');

// Fall 4: Stufe 2 (Mittelgrün - Umkehraufgabe)
const visStep2 = getFactVisualStatus({
  ...baseFact,
  totalAttempts: 5,
  correctAttempts: 5,
  repetitions: 5,
  interval: 10,
  masteredVariants: ['mult', 'div'],
});
assert.strictEqual(visStep2.level, 'green_step2');
assert.strictEqual(visStep2.hasCrown, false);
assert.strictEqual(visStep2.badge, '🟢');

// Fall 5: Stufe 3 (Dunkelgrün - Lückenaufgabe, Intervall < 14)
const visStep3 = getFactVisualStatus({
  ...baseFact,
  totalAttempts: 7,
  correctAttempts: 7,
  repetitions: 6,
  interval: 10,
  masteredVariants: ['mult', 'div', 'gap_mult_b'],
});
assert.strictEqual(visStep3.level, 'green_step3');
assert.strictEqual(visStep3.hasCrown, false);
assert.strictEqual(visStep3.badge, '🟢');

// Fall 6: Langzeit-Meister mit Krone (Stufe 3 + Intervall >= 14)
const visCrown = getFactVisualStatus({
  ...baseFact,
  totalAttempts: 10,
  correctAttempts: 10,
  repetitions: 8,
  interval: 21,
  masteredVariants: ['mult', 'div', 'gap_mult_b'],
});
assert.strictEqual(visCrown.level, 'green_step3');
assert.strictEqual(visCrown.hasCrown, true);
assert.strictEqual(visCrown.badge, '👑');

// Fall 7: Zartes Rosa / Soft-Rot (kürzlicher Einzelfehler)
const visWrongSoft = getFactVisualStatus({
  ...baseFact,
  totalAttempts: 2,
  correctAttempts: 1,
  repetitions: 0,
  interval: 1,
  lastQuality: 0,
  easeFactor: 2.3,
});
assert.strictEqual(visWrongSoft.level, 'wrong_soft');
assert.strictEqual(visWrongSoft.hasCrown, false);
assert.strictEqual(visWrongSoft.badge, '🌸');

// Fall 8: Dunkelrot / Hard-Rot (Wackelkandidat, EaseFactor < 2.0 oder Trefferquote < 65%)
const visWrongHard = getFactVisualStatus({
  ...baseFact,
  totalAttempts: 5,
  correctAttempts: 2,
  repetitions: 0,
  interval: 1,
  lastQuality: 0,
  easeFactor: 1.8,
});
assert.strictEqual(visWrongHard.level, 'wrong_hard');
assert.strictEqual(visWrongHard.hasCrown, false);
assert.strictEqual(visWrongHard.badge, '🚨');

console.log('✓ Test 7 bestanden: 3 Grün-Stufen, 2 Rot-Stufen und Langzeit-Krone berechnen präzise.');

console.log('=== ALLE DIDAKTISCHEN TESTS ERFOLGREICH BESTANDEN! ===');
