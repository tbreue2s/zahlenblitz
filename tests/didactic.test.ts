import assert from 'node:assert';
import {
  classifyStrategyMult,
  classifyStrategyPM,
  formatEquationPartsV3,
  generateMultFacts,
  generatePlusMinusFacts,
  selectTaskVariant,
} from '../src/v3/lib/generator';
import { getWorldChaptersV3 } from '../src/v3/lib/chapters';
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

// --- TEST 3: Varianten-Auswahl & Didaktische Stufen ---
const newFact: FactFamily = { ...pmFacts[0], repetitions: 0 };
for (let i = 0; i < 500; i++) {
  const v = selectTaskVariant(newFact);
  assert.strictEqual(v, 'add', 'Bei repetitions === 0 muss immer die Grundaufgabe add kommen');
}

const learnedFact: FactFamily = { ...pmFacts[0], repetitions: 1 };
let sawAdd = false;
let sawSub = false;
for (let i = 0; i < 500; i++) {
  const v = selectTaskVariant(learnedFact);
  if (v === 'add') sawAdd = true;
  if (v === 'sub') sawSub = true;
}
assert.ok(sawAdd && sawSub, 'Bei repetitions === 1 müssen Grund- und Umkehraufgaben vorkommen');

const masteredFact: FactFamily = { ...pmFacts[0], repetitions: 3, masteredVariants: [] };
let sawGap = false;
for (let i = 0; i < 500; i++) {
  const v = selectTaskVariant(masteredFact);
  if (v.startsWith('gap_')) {
    sawGap = true;
    assert.ok(v === 'gap_add_b' || v === 'gap_sub_b', `Nur standardisierte PlusMinus-Lücken erlaubt: ${v}`);
    const task = formatEquationPartsV3(masteredFact, v);
    assert.ok(!task.prompt.startsWith('?'), `Prompt darf nicht mit ? beginnen: ${task.prompt}`);
  }
}
assert.ok(sawGap, 'Bei repetitions >= 2 müssen auch Lückenaufgaben vorkommen');

const masteredMultFact: FactFamily = { ...multFacts[0], repetitions: 3, masteredVariants: [] };
let sawMultGap = false;
for (let i = 0; i < 500; i++) {
  const v = selectTaskVariant(masteredMultFact);
  if (v.startsWith('gap_')) {
    sawMultGap = true;
    assert.ok(v === 'gap_mult_b' || v === 'gap_div_a', `Nur standardisierte 1x1-Lücken erlaubt: ${v}`);
    const task = formatEquationPartsV3(masteredMultFact, v);
    assert.ok(!task.prompt.startsWith('?'), `Prompt darf nicht mit ? beginnen: ${task.prompt}`);
  }
}
assert.ok(sawMultGap, 'Bei repetitions >= 2 müssen auch 1x1-Lückenaufgaben vorkommen');
console.log('✓ Test 3 bestanden: Varianten-Auswahl schützt vor Überforderung und alle Lückenaufgaben folgen strikt Zahl [Op] ? = Zahl.');

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
  getWeakSpotFactsV3,
  buildWeakSpotsSessionQueueV3,
  buildBlitzChallengeQueueV3,
} from '../src/v3/lib/storage';
import { getAccessibleFactsPoolV3 } from '../src/v3/lib/chapters';

// Frischer Fakten-Satz: Keine Welt freigespielt (nur Welt 1 aktiv)
const freshMultFacts = generateMultFacts();
const { accessibleFacts: freshAccessible, unlockedWorldCount: freshCount } =
  getAccessibleFactsPoolV3(freshMultFacts, 'mult');
assert.strictEqual(freshCount, 1, 'Bei ungespieltem Stand darf nur Welt 1 freigeschaltet sein');

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

console.log('✓ Test 5 bestanden: Welten-Schutz und Geteilt-Schutz verhindern Überforderung, freie Weltenwahl funktioniert.');

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

const weakQueue = buildWeakSpotsSessionQueueV3(factsWithFlaws, 10);
assert.strictEqual(weakQueue.length, 10, 'Wackelkandidaten-Queue muss 10 Aufgaben liefern');

const blitzQueue = buildBlitzChallengeQueueV3(factsWithFlaws, 60);
assert.strictEqual(blitzQueue.length, 60, 'Blitz-Queue muss 60 Aufgaben für den 60s Sprint liefern');
console.log('✓ Test 6 bestanden: Wackelkandidaten-Trainer & 60s Blitz-Challenge funktionieren fehlerfrei.');

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
