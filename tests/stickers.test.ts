import assert from 'node:assert';
import { ALL_STICKERS, getStickersByCategory, STICKER_CATEGORIES } from '../src/v3/lib/stickers';
import { createNewProfileV3 } from '../src/v3/lib/storage';

console.log('=== START STICKER TESTS V3 ===');

// --- TEST 1: Sticker-Katalog Integrität ---
assert.strictEqual(ALL_STICKERS.length, 24, 'Es müssen exakt 24 Sticker vorhanden sein');

const ids = new Set<string>();
for (const s of ALL_STICKERS) {
  assert.ok(!ids.has(s.id), `Doppelte Sticker-ID gefunden: ${s.id}`);
  ids.add(s.id);
  assert.ok(s.name.length > 0, `Sticker ${s.id} braucht einen Namen`);
  assert.ok(s.emoji.length > 0, `Sticker ${s.id} braucht ein Emoji`);
  assert.ok(s.cost >= 15 && s.cost <= 500, `Sticker ${s.id} Kosten müssen zwischen 15 und 500 liegen: ${s.cost}`);
  assert.ok(['animals', 'space', 'magic', 'champions'].includes(s.category), `Ungültige Kategorie für ${s.id}`);
}
console.log('✓ Test 1 bestanden: Alle 24 Sticker sind valide und besitzen eindeutige IDs & faire Preise.');

// --- TEST 2: Kategorien-Verteilung ---
for (const cat of STICKER_CATEGORIES) {
  const inCat = getStickersByCategory(cat.id);
  assert.strictEqual(inCat.length, 6, `Kategorie ${cat.id} muss exakt 6 Sticker haben`);
}
console.log('✓ Test 2 bestanden: Exakt 6 Sticker pro Themenwelt (Tiere, Weltraum, Magie, Champions).');

// --- TEST 3: Profil-Initialisierung mit Stickern ---
const profile = createNewProfileV3('Testkind', '🦊');
assert.ok(Array.isArray(profile.unlockedStickers), 'unlockedStickers muss als Array initialisiert werden');
assert.strictEqual(profile.unlockedStickers?.length, 0, 'Neues Profil startet mit 0 Stickern');

profile.unlockedStickers = ['tier_fuchs', 'space_rakete'];
profile.activeBadge = 'tier_fuchs';
assert.strictEqual(profile.unlockedStickers.length, 2);
assert.strictEqual(profile.activeBadge, 'tier_fuchs');
console.log('✓ Test 3 bestanden: Sticker-Kollektion und Abzeichen lassen sich problemlos im Profil speichern.');

console.log('=== ALLE STICKER-TESTS ERFOLGREICH BESTANDEN! ===');
