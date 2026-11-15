<script lang="ts">
  import { getFactVisualStatus } from '../lib/sm2';
  import { getAccessibleFactsPoolV3, getFactWorld } from '../lib/chapters';
  import type { FactFamily, FactVisualStatus, GameMode } from '../lib/types';

  interface Props {
    gameMode: GameMode;
    facts: FactFamily[];
    freeWorldChoice?: boolean;
    onPracticeFact?: (fact: FactFamily) => void;
  }

  let {
    gameMode,
    facts,
    freeWorldChoice = false,
    onPracticeFact,
  }: Props = $props();

  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  let selectedFact = $state<FactFamily | null>(null);
  let hoveredCell = $state<{ a: number; b: number } | null>(null);
  let selectedWorldFilter = $state<0 | 1 | 2 | 3>(0);
  let lockedPromptFact = $state<FactFamily | null>(null);
  let showLegendModal = $state(false);

  let accessiblePool = $derived(getAccessibleFactsPoolV3(facts, gameMode, freeWorldChoice));
  let unlockedWorldCount = $derived(accessiblePool.unlockedWorldCount);

  function getFactForCell(a: number, b: number): FactFamily | undefined {
    return facts.find((f) => f.a === a && f.b === b);
  }

  function isFactLocked(f: FactFamily | undefined): boolean {
    if (!f) return false;
    return getFactWorld(f) > unlockedWorldCount;
  }

  function getWorldTitle(w: 1 | 2 | 3): string {
    if (gameMode === 'mult') {
      if (w === 1) return 'Welt 1: Kernreihen (1, 2, 5, 10)';
      if (w === 2) return 'Welt 2: Forscherreihen (3 & 4)';
      return 'Welt 3: Königsaufgaben (6, 7, 8, 9)';
    } else {
      if (w === 1) return 'Welt 1: Basis bis 10';
      if (w === 2) return 'Welt 2: Doppelgänger & Nachbarn';
      return 'Welt 3: Zehnerübergang';
    }
  }

  function getVisual(a: number, b: number): FactVisualStatus {
    const f = getFactForCell(a, b);
    return f
      ? getFactVisualStatus(f)
      : {
          level: 'fresh',
          hasCrown: false,
          label: 'Neu',
          badge: '⚪',
          shortDesc: 'Noch nicht geübt',
        };
  }

  let activeA = $derived(hoveredCell?.a ?? selectedFact?.a ?? null);
  let activeB = $derived(hoveredCell?.b ?? selectedFact?.b ?? null);
</script>

<section class="bg-white dark:bg-[#141b2d] rounded-3xl p-3.5 sm:p-4 border border-slate-200/80 dark:border-slate-700/60 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.05)] dark:shadow-[0_8px_24px_-4px_rgba(0,0,0,0.5)] space-y-2.5" aria-label="10x10 Rechentafel">
  <!-- Welten-Auswahl & Legende (alles kompakt auf einer Zeile, ohne horizontales Scrollen) -->
  <div class="flex items-center justify-between gap-1.5 flex-wrap">
    <div class="flex items-center gap-1.5 text-xs">
      <button
        type="button"
        onclick={() => (selectedWorldFilter = 0)}
        class="text-[10px] font-extrabold px-2.5 py-1 rounded-xl border transition cursor-pointer {
          selectedWorldFilter === 0
            ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400'
        }"
      >
        Alle
      </button>

      <button
        type="button"
        onclick={() => (selectedWorldFilter = selectedWorldFilter === 1 ? 0 : 1)}
        class="text-[10px] font-extrabold px-2.5 py-1 rounded-xl border transition cursor-pointer {
          selectedWorldFilter === 1
            ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400'
        }"
      >
        Welt 1
      </button>

      <button
        type="button"
        onclick={() => (selectedWorldFilter = selectedWorldFilter === 2 ? 0 : 2)}
        class="text-[10px] font-extrabold px-2.5 py-1 rounded-xl border transition cursor-pointer flex items-center gap-1 {
          selectedWorldFilter === 2
            ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400'
        }"
      >
        <span>Welt 2</span>
        {#if unlockedWorldCount < 2}
          <span class="text-[9px]">🔒</span>
        {/if}
      </button>

      <button
        type="button"
        onclick={() => (selectedWorldFilter = selectedWorldFilter === 3 ? 0 : 3)}
        class="text-[10px] font-extrabold px-2.5 py-1 rounded-xl border transition cursor-pointer flex items-center gap-1 {
          selectedWorldFilter === 3
            ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400'
        }"
      >
        <span>Welt 3</span>
        {#if unlockedWorldCount < 3}
          <span class="text-[9px]">🔒</span>
        {/if}
      </button>
    </div>

    <!-- Legende Button -->
    <button
      type="button"
      onclick={() => (showLegendModal = true)}
      class="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/60 dark:border-indigo-800/40 px-2 py-1 rounded-xl cursor-pointer hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition flex items-center gap-1 shrink-0"
    >
      <span>ℹ️</span>
      <span>Legende</span>
    </button>
  </div>

  <!-- Didaktischer Erklär-Banner für aktive Welt (bei Klick auf Welt 1, 2 oder 3) -->
  {#if selectedWorldFilter === 1}
    <div class="text-[10px] text-slate-700 dark:text-slate-200 bg-indigo-50/80 dark:bg-indigo-950/50 p-2.5 rounded-2xl border border-indigo-200/60 dark:border-indigo-800/60 animate-fade-in flex items-center gap-2">
      <span class="text-base shrink-0">🥉</span>
      <span><strong>Welt 1 ({gameMode === 'mult' ? 'Kernaufgaben' : 'Basis bis 10'}):</strong> {gameMode === 'mult' ? 'Reihen 1, 2, 5 und 10 bilden das solide Kreuz-Skelett der 100er-Tafel.' : 'Alle 45 Zerlegungen bis 10 bilden das unverzichtbare Fundament.'}</span>
    </div>
  {:else if selectedWorldFilter === 2}
    <div class="text-[10px] text-slate-700 dark:text-slate-200 bg-indigo-50/80 dark:bg-indigo-950/50 p-2.5 rounded-2xl border border-indigo-200/60 dark:border-indigo-800/60 animate-fade-in flex items-center gap-2">
      <span class="text-base shrink-0">🥈</span>
      <span><strong>Welt 2 ({gameMode === 'mult' ? 'Forscherreihen' : 'Doppelgänger & Nachbarn'}):</strong> {gameMode === 'mult' ? 'Reihen 3 & 4 nutzen geschicktes Verdoppeln und Nachbar-Beziehungen zur Basis.' : 'Verdoppeln und Nachbaraufgaben bis 20 festigen Zwischenschritte.'}</span>
    </div>
  {:else if selectedWorldFilter === 3}
    <div class="text-[10px] text-amber-900 dark:text-amber-200 bg-amber-50/80 dark:bg-amber-950/50 p-2.5 rounded-2xl border border-amber-200/60 dark:border-amber-800/60 animate-fade-in flex items-center gap-2">
      <span class="text-base shrink-0">🥇</span>
      <span><strong>Welt 3 ({gameMode === 'mult' ? 'Königsaufgaben' : 'Zehnerübergang'}):</strong> {gameMode === 'mult' ? 'Die 16 anspruchsvollsten Königsaufgaben der Reihen 6, 7, 8 und 9 (z. B. 7 × 8 = 56).' : 'Der Zehnerübergang (Zehnerstopp über die 10, z. B. 8 + 5 = 13).'}</span>
    </div>
  {/if}

  <!-- 11x11 Matrix Grid (Zahlen oben und links für volle Übersicht) -->
  <div class="w-full overflow-x-auto pb-1">
    <!-- Achsen-Beschriftung zur Orientierung -->
    <div class="flex items-center justify-between text-[10px] text-indigo-600 dark:text-indigo-400 font-extrabold max-w-sm mx-auto px-1.5 pb-1">
      <span>↓ Zeile (1. Zahl)</span>
      <span>Spalte (2. Zahl) →</span>
    </div>

    <div class="grid grid-cols-11 gap-0.5 sm:gap-1 min-w-[280px] max-w-sm mx-auto p-1.5 sm:p-2 bg-slate-100/80 dark:bg-slate-950/70 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl select-none">
      
      <!-- Obere linke Ecke (Operator) -->
      <div class="aspect-square rounded-md bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center text-[10px] sm:text-xs font-black shadow-sm ring-1 ring-indigo-400">
        {gameMode === 'mult' ? '×' : '+'}
      </div>

      <!-- Spalten-Header oben (b = 1..10) -->
      {#each numbers as b}
        {@const isColActive = activeB === b}
        <div class="aspect-square rounded-md flex items-center justify-center text-[9.5px] sm:text-[11px] font-black transition-all {
          isColActive
            ? 'bg-indigo-600 dark:bg-indigo-500 text-white border-indigo-600 dark:border-indigo-500 shadow-md ring-2 ring-indigo-400 scale-105 z-10'
            : 'bg-indigo-100/90 dark:bg-indigo-950/70 border border-indigo-300/80 dark:border-indigo-700/80 text-indigo-950 dark:text-indigo-100 shadow-2xs'
        }">
          {b}
        </div>
      {/each}

      <!-- Zeilen (a = 1..10) -->
      {#each numbers as a}
        <!-- Zeilen-Header links (a) -->
        {@const isRowActive = activeA === a}
        <div class="aspect-square rounded-md flex items-center justify-center text-[9.5px] sm:text-[11px] font-black transition-all {
          isRowActive
            ? 'bg-indigo-600 dark:bg-indigo-500 text-white border-indigo-600 dark:border-indigo-500 shadow-md ring-2 ring-indigo-400 scale-105 z-10'
            : 'bg-indigo-100/90 dark:bg-indigo-950/70 border border-indigo-300/80 dark:border-indigo-700/80 text-indigo-950 dark:text-indigo-100 shadow-2xs'
        }">
          {a}
        </div>

        <!-- 10 Datenzellen für Zeile a -->
        {#each numbers as b}
          {@const fact = getFactForCell(a, b)}
          {@const vis = getVisual(a, b)}
          {@const world = fact ? getFactWorld(fact) : 1}
          {@const locked = isFactLocked(fact)}
          {@const isDimmed = selectedWorldFilter > 0 && world !== selectedWorldFilter}
          {@const isSelected = selectedFact?.a === a && selectedFact?.b === b}
          {@const isInCrosshair = activeA === a || activeB === b}

          <button
            type="button"
            onclick={() => {
              if (fact) {
                if (locked) {
                  lockedPromptFact = fact;
                } else {
                  selectedFact = selectedFact?.id === fact.id ? null : fact;
                }
              }
            }}
            onmouseenter={() => (hoveredCell = { a, b })}
            onmouseleave={() => (hoveredCell = null)}
            class="relative aspect-square rounded-md transition-all cursor-pointer border-none p-0 flex items-center justify-center text-[8px] sm:text-[9.5px] font-black {
              isDimmed
                ? 'opacity-20 grayscale brightness-75 scale-90'
                : 'hover:scale-115 hover:z-20'
            } {
              isSelected
                ? 'ring-2 ring-indigo-500 scale-110 z-10'
                : ''
            } {
              locked
                ? 'bg-slate-200/80 dark:bg-slate-800/60 text-slate-400 dark:text-slate-500 border border-dashed border-slate-300 dark:border-slate-700'
                : vis.level === 'green_step3'
                ? 'bg-emerald-800 dark:bg-emerald-800 text-white shadow-xs ring-1 ring-emerald-900 dark:ring-emerald-700'
                : vis.level === 'green_step2'
                ? 'bg-emerald-500 dark:bg-emerald-600 text-white shadow-2xs'
                : vis.level === 'green_step1'
                ? 'bg-emerald-300 dark:bg-emerald-400 text-emerald-950 dark:text-emerald-950'
                : vis.level === 'wrong_hard'
                ? 'bg-rose-600 dark:bg-rose-600 text-white animate-pulse ring-1 ring-rose-400 dark:ring-rose-500'
                : vis.level === 'wrong_soft'
                ? 'bg-rose-200 dark:bg-rose-300 text-rose-900 dark:text-rose-950'
                : vis.level === 'learning'
                ? 'bg-amber-300 dark:bg-amber-400 text-amber-950 dark:text-amber-950'
                : isInCrosshair
                ? 'bg-indigo-100/70 dark:bg-slate-700 text-indigo-900 dark:text-indigo-200'
                : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }"
            title="{a} {gameMode === 'mult' ? '×' : '+'} {b} = {fact?.c} ({locked ? 'Gesperrt' : `${vis.badge} ${vis.label}`})"
            aria-label="{a} {gameMode === 'mult' ? 'mal' : 'plus'} {b} ist {fact?.c}"
          >
            {#if locked}
              <span class="text-[8px] sm:text-[9.5px]">🔒</span>
            {:else}
              <span class="truncate">{fact ? fact.c : ''}</span>
              {#if vis.hasCrown}
                <span class="absolute -top-1 -right-0.5 text-[7px] sm:text-[8.5px] leading-none pointer-events-none drop-shadow">
                  👑
                </span>
              {:else if world === 3}
                <span class="absolute top-0.5 right-0.5 w-1 h-1 rounded-full bg-amber-400/80 pointer-events-none" title="Königsaufgabe"></span>
              {/if}
            {/if}
          </button>
        {/each}
      {/each}
    </div>
  </div>

  <!-- Schnell-Inspektion bei ausgewählter Zelle -->
  {#if selectedFact}
    {@const vis = getFactVisualStatus(selectedFact)}
    <div class="mt-2.5 p-2.5 sm:p-3 bg-indigo-50 dark:bg-indigo-950/50 rounded-2xl border border-indigo-200 dark:border-indigo-800 flex items-center justify-between gap-2 animate-fade-in">
      <div class="truncate">
        <div class="text-xs sm:text-sm font-black text-indigo-950 dark:text-indigo-100 flex items-center gap-1.5">
          <span>{selectedFact.a} {selectedFact.mode === 'mult' ? '×' : '+'} {selectedFact.b} = {selectedFact.c}</span>
          {#if vis.hasCrown}
            <span>👑</span>
          {:else if vis.level === 'green_step3'}
            <span class="inline-block w-3.5 h-3.5 rounded-full bg-emerald-800 dark:bg-emerald-800 border border-emerald-950 dark:border-emerald-600 shrink-0 shadow-2xs" title="Stufe 3 (Dunkelgrüner Kreis)"></span>
          {:else if vis.level === 'green_step2'}
            <span class="inline-block w-3.5 h-3.5 rounded-full bg-emerald-500 dark:bg-emerald-600 border border-emerald-700 dark:border-emerald-400 shrink-0 shadow-2xs" title="Stufe 2 (Mittelgrüner Kreis)"></span>
          {:else if vis.level === 'green_step1'}
            <span class="inline-block w-3.5 h-3.5 rounded-full bg-emerald-300 dark:bg-emerald-400 border border-emerald-500 dark:border-emerald-200 shrink-0 shadow-2xs" title="Stufe 1 (Hellgrüner Kreis)"></span>
          {:else}
            <span>{vis.badge}</span>
          {/if}
        </div>
        <div class="text-[10px] text-indigo-700 dark:text-indigo-300 font-semibold truncate">
          <span>{vis.label}</span> · <span>{vis.shortDesc}</span>
        </div>
      </div>
      {#if onPracticeFact}
        <button
          type="button"
          onclick={() => {
            const f = selectedFact;
            selectedFact = null;
            if (f) onPracticeFact(f);
          }}
          class="shrink-0 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black border-none cursor-pointer shadow-xs transition"
        >
          🎯 Gezielt üben →
        </button>
      {/if}
    </div>
  {/if}
</section>

<!-- MODAL: HINWEIS BEI GESPERRTEM FAKT -->
{#if lockedPromptFact}
  {@const w = getFactWorld(lockedPromptFact)}
  <div
    class="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in"
    onclick={(e) => {
      if (e.target === e.currentTarget) lockedPromptFact = null;
    }}
    onkeydown={(e) => {
      if (e.key === 'Escape') lockedPromptFact = null;
    }}
    tabindex="-1"
    role="dialog"
    aria-modal="true"
    aria-label="Aufgabe gesperrt"
  >
    <div class="w-full max-w-sm bg-white dark:bg-[#141b2d] border-2 border-indigo-200 dark:border-indigo-800 rounded-3xl p-5 shadow-2xl space-y-3.5 animate-scale-up text-center">
      <div class="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 text-2xl flex items-center justify-center mx-auto shadow-2xs">
        🔒
      </div>
      <div>
        <h3 class="text-sm font-black text-slate-900 dark:text-white m-0">
          {getWorldTitle(w)} - Noch gesperrt
        </h3>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 m-0 leading-relaxed">
          Diese Aufgabe ({lockedPromptFact.a} {gameMode === 'mult' ? '×' : '+'} {lockedPromptFact.b}) ist eine Aufgabe aus Welt 2 oder Welt 3.
        </p>
      </div>
      <button
        type="button"
        onclick={() => (lockedPromptFact = null)}
        class="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black rounded-xl border-none cursor-pointer shadow-xs"
      >
        Verstanden ✓
      </button>
    </div>
  </div>
{/if}

<!-- MODAL: FARB-LEGENDE -->
{#if showLegendModal}
  <div
    class="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 animate-fade-in"
    onclick={(e) => {
      if (e.target === e.currentTarget) showLegendModal = false;
    }}
    onkeydown={(e) => {
      if (e.key === 'Escape') showLegendModal = false;
    }}
    tabindex="-1"
    role="dialog"
    aria-modal="true"
    aria-label="Farb-Legende"
  >
    <div class="w-full max-w-md bg-white dark:bg-[#141b2d] border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl max-h-[90dvh] overflow-y-auto space-y-4">
      <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 class="text-base font-extrabold text-slate-900 dark:text-white m-0">
            Farb-Legende
          </h3>
          <p class="text-xs text-slate-400 m-0">
            Was bedeuten die Farben auf der Rechentafel?
          </p>
        </div>
        <button
          type="button"
          onclick={() => (showLegendModal = false)}
          class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 text-xs font-bold border-none cursor-pointer flex items-center justify-center"
        >
          ✕
        </button>
      </div>

      <!-- DIE STUFEN -->
      <div class="space-y-2.5 text-xs">
        <!-- Krone -->
        <div class="flex items-start gap-3 p-2.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800">
          <span class="text-2xl shrink-0">👑</span>
          <div>
            <div class="font-black text-amber-900 dark:text-amber-200">
              Goldene Krone · Langzeitgedächtnis
            </div>
            <div class="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-0.5 leading-snug">
              Höchste Auszeichnung! Alle 3 Stufen gemeistert und im Langzeit-Spaced-Repetition verankert.
            </div>
          </div>
        </div>

        <!-- Dunkelgrün: Stufe 3 -->
        <div class="flex items-start gap-3 p-2.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800">
          <span class="inline-block w-5 h-5 rounded-full bg-emerald-800 dark:bg-emerald-800 border border-emerald-950 dark:border-emerald-600 shrink-0 shadow-2xs mt-0.5"></span>
          <div>
            <div class="font-black text-emerald-950 dark:text-emerald-100">
              Dunkelgrüner Kreis · Stufe 3: Lückenaufgabe gemeistert
            </div>
            <div class="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 mt-0.5 leading-snug">
              Höchstes Verständnis! Auch Lückenaufgaben wurden sicher gelöst.
            </div>
          </div>
        </div>

        <!-- Mittelgrün: Stufe 2 -->
        <div class="flex items-start gap-3 p-2.5 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60">
          <span class="inline-block w-5 h-5 rounded-full bg-emerald-500 dark:bg-emerald-600 border border-emerald-700 dark:border-emerald-400 shrink-0 shadow-2xs mt-0.5"></span>
          <div>
            <div class="font-black text-emerald-950 dark:text-emerald-100">
              Mittelgrüner Kreis · Stufe 2: Umkehraufgabe gemeistert
            </div>
            <div class="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 mt-0.5 leading-snug">
              Starkes Rechenverständnis! Auch die Umkehraufgabe sitzt.
            </div>
          </div>
        </div>

        <!-- Hellgrün: Stufe 1 -->
        <div class="flex items-start gap-3 p-2.5 rounded-2xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
          <span class="inline-block w-5 h-5 rounded-full bg-emerald-300 dark:bg-emerald-400 border border-emerald-500 dark:border-emerald-200 shrink-0 shadow-2xs mt-0.5"></span>
          <div>
            <div class="font-black text-emerald-950 dark:text-emerald-100">
              Hellgrüner Kreis · Stufe 1: Grundaufgabe sitzt sicher
            </div>
            <div class="text-[11px] text-emerald-800/80 dark:text-emerald-300/80 mt-0.5 leading-snug">
              Die normale Grundaufgabe wurde fehlerfrei gelöst.
            </div>
          </div>
        </div>

        <!-- Gelb: Lernen -->
        <div class="flex items-start gap-3 p-2.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40">
          <span class="text-xl shrink-0">🟡</span>
          <div>
            <div class="font-black text-amber-900 dark:text-amber-200">
              Gelber Kreis · Am Lernen
            </div>
            <div class="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-0.5 leading-snug">
              Einmal richtig gerechnet, wird bald zur Festigung wiederholt.
            </div>
          </div>
        </div>

        <!-- Rosa: Leichter Fehler -->
        <div class="flex items-start gap-3 p-2.5 rounded-2xl bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200/50 dark:border-rose-900/40">
          <span class="text-xl shrink-0">🌸</span>
          <div>
            <div class="font-black text-rose-900 dark:text-rose-200">
              Rosa Blüte · Vertippt / 1 Fehler
            </div>
            <div class="text-[11px] text-rose-800/80 dark:text-rose-300/80 mt-0.5 leading-snug">
              Kürzlich einmal falsch gerechnet oder vertippt. Kommt bald zur kurzen Wiederholung.
            </div>
          </div>
        </div>

        <!-- Rot: Alarm / Wackelkandidat -->
        <div class="flex items-start gap-3 p-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800">
          <span class="text-xl shrink-0">🚨</span>
          <div>
            <div class="font-black text-rose-900 dark:text-rose-200">
              Dunkelrot pulsierend · Wackelkandidat
            </div>
            <div class="text-[11px] text-rose-800/80 dark:text-rose-300/80 mt-0.5 leading-snug">
              Mehrfach falsch gerechnet. Wird im <strong>Wackelkandidaten-Trainer</strong> gezielt trainiert!
            </div>
          </div>
        </div>

        <!-- Schloss: Gesperrt -->
        <div class="flex items-start gap-3 p-2.5 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
          <span class="text-xl shrink-0">🔒</span>
          <div>
            <div class="font-black text-slate-800 dark:text-slate-200">
              Schloss - Noch gesperrt
            </div>
            <div class="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-snug">
              Aufgabe aus Welt 2 oder Welt 3
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}
