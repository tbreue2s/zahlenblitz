<script lang="ts">
  import { getFactVisualStatus } from '../lib/sm2';
  import {
    getAccessibleFactsPoolV3,
    getFactWorld,
    getWorldChaptersV3,
    type WorldChapterV3,
  } from '../lib/chapters';
  import type {
    FactFamily,
    FactVisualStatus,
    GameMode,
    PracticeOperation,
  } from '../lib/types';

  interface Props {
    gameMode: GameMode;
    facts: FactFamily[];
    freeWorldChoice?: boolean;
    practiceOperation?: PracticeOperation;
    onPracticeFact?: (fact: FactFamily) => void;
    onStartChapterSession?: (chapter: WorldChapterV3) => void;
    onStartRowSession?: (rowNumber: number) => void;
  }

  let {
    gameMode,
    facts,
    freeWorldChoice = false,
    practiceOperation = 'base',
    onPracticeFact,
    onStartChapterSession,
    onStartRowSession,
  }: Props = $props();

  let opLabel = $derived.by(() => {
    if (practiceOperation === 'gap') return 'Lücken';
    if (gameMode === 'mult') {
      if (practiceOperation === 'inverse') return 'Geteilt';
      if (practiceOperation === 'mix') return 'Mal & Geteilt';
      return 'Mal';
    }
    if (practiceOperation === 'inverse') return 'Minus';
    if (practiceOperation === 'mix') return 'Plus & Minus';
    return 'Plus';
  });

  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  let selectedFact = $state<FactFamily | null>(null);
  let hoveredCell = $state<{ a: number; b: number } | null>(null);
  let selectedWorldFilter = $state<0 | 1 | 2 | 3>(0);
  let selectedRowOrCol = $state<number | null>(null);
  let lockedPromptFact = $state<FactFamily | null>(null);
  let showLegendModal = $state(false);

  let accessiblePool = $derived(getAccessibleFactsPoolV3(facts, gameMode, freeWorldChoice));
  let unlockedWorldCount = $derived(accessiblePool.unlockedWorldCount);
  let chapters = $derived(getWorldChaptersV3(facts, gameMode));

  function getFactForCell(a: number, b: number): FactFamily | undefined {
    return facts.find((f) => f.a === a && f.b === b);
  }

  function isFactLocked(f: FactFamily | undefined): boolean {
    if (!f) return false;
    return getFactWorld(f) > unlockedWorldCount;
  }

  function handleSelectWorld(w: 0 | 1 | 2 | 3) {
    selectedWorldFilter = selectedWorldFilter === w ? 0 : w;
    selectedRowOrCol = null;
    selectedFact = null;
  }

  function handleToggleRowOrCol(n: number) {
    if (selectedRowOrCol === n) {
      selectedRowOrCol = null;
    } else {
      selectedRowOrCol = n;
      selectedFact = null;
      selectedWorldFilter = 0;
    }
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

<section class="bg-white dark:bg-[#1c1c1e] rounded-[22px] p-3.5 sm:p-4 border border-black/[0.07] dark:border-white/[0.07] space-y-2.5" aria-label="10x10 Rechentafel">
  <!-- Welten-Auswahl & Legende (alles kompakt auf einer Zeile, ohne horizontales Scrollen) -->
  <div class="flex items-center justify-between gap-1.5 flex-wrap">
    <div class="flex items-center gap-1 text-xs">
      <button
        type="button"
        onclick={() => handleSelectWorld(0)}
        class="text-[11px] font-extrabold px-2.5 py-1.5 rounded-full border transition cursor-pointer {
          selectedWorldFilter === 0 && selectedRowOrCol === null
            ? 'bg-[#0a6cff] dark:bg-[#4c9aff] text-white dark:text-[#00112b] border-transparent'
            : 'bg-[#f6f7f9] dark:bg-white/[0.07] text-[#6b7280] dark:text-[#98989f] border-transparent hover:text-[#0f1115] dark:hover:text-white'
        }"
      >
        Alle
      </button>

      <button
        type="button"
        onclick={() => handleSelectWorld(1)}
        class="text-[11px] font-extrabold px-2.5 py-1.5 rounded-full border transition cursor-pointer {
          selectedWorldFilter === 1
            ? 'bg-[#0a6cff] dark:bg-[#4c9aff] text-white dark:text-[#00112b] border-transparent'
            : 'bg-[#f6f7f9] dark:bg-white/[0.07] text-[#6b7280] dark:text-[#98989f] border-transparent hover:text-[#0f1115] dark:hover:text-white'
        }"
      >
        Welt 1
      </button>

      <button
        type="button"
        onclick={() => handleSelectWorld(2)}
        class="text-[11px] font-extrabold px-2.5 py-1.5 rounded-full border transition cursor-pointer flex items-center gap-1 {
          selectedWorldFilter === 2
            ? 'bg-[#0a6cff] dark:bg-[#4c9aff] text-white dark:text-[#00112b] border-transparent'
            : 'bg-[#f6f7f9] dark:bg-white/[0.07] text-[#6b7280] dark:text-[#98989f] border-transparent hover:text-[#0f1115] dark:hover:text-white'
        }"
      >
        <span>Welt 2</span>
        {#if unlockedWorldCount < 2}
          <span class="text-[9px]">🔒</span>
        {/if}
      </button>

      <button
        type="button"
        onclick={() => handleSelectWorld(3)}
        class="text-[11px] font-extrabold px-2.5 py-1.5 rounded-full border transition cursor-pointer flex items-center gap-1 {
          selectedWorldFilter === 3
            ? 'bg-[#0a6cff] dark:bg-[#4c9aff] text-white dark:text-[#00112b] border-transparent'
            : 'bg-[#f6f7f9] dark:bg-white/[0.07] text-[#6b7280] dark:text-[#98989f] border-transparent hover:text-[#0f1115] dark:hover:text-white'
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
      class="text-[11px] font-bold text-[#0a6cff] dark:text-[#4c9aff] bg-[#e8f0ff] dark:bg-[#4c9aff]/15 border-none px-2.5 py-1.5 rounded-full cursor-pointer hover:bg-[#d6e5ff] dark:hover:bg-[#4c9aff]/25 transition flex items-center gap-1 shrink-0"
    >
      <svg class="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>
      <span>Legende</span>
    </button>
  </div>

  <!-- Didaktischer Erklär-Banner für aktive Welt (bei Klick auf Welt 1, 2 oder 3) -->
  {#if selectedWorldFilter === 1}
    <div class="text-[10px] text-slate-700 dark:text-slate-200 bg-[#e8f0ff] dark:bg-[#4c9aff]/15 p-2.5 rounded-2xl border border-[#0a6cff]/25 dark:border-[#4c9aff]/30 animate-fade-in flex items-center gap-2">
      <span class="text-base shrink-0">🥉</span>
      <span><strong>Welt 1 ({gameMode === 'mult' ? 'Kernaufgaben' : 'Basis bis 10'}):</strong> {gameMode === 'mult' ? 'Reihen 1, 2, 5 und 10 bilden das solide Kreuz-Skelett der 100er-Tafel.' : 'Alle 45 Zerlegungen bis 10 bilden das unverzichtbare Fundament.'}</span>
    </div>
  {:else if selectedWorldFilter === 2}
    <div class="text-[10px] text-slate-700 dark:text-slate-200 bg-[#e8f0ff] dark:bg-[#4c9aff]/15 p-2.5 rounded-2xl border border-[#0a6cff]/25 dark:border-[#4c9aff]/30 animate-fade-in flex items-center gap-2">
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
    <div class="flex items-center justify-between text-[11px] text-[#6b7280] dark:text-[#98989f] font-bold max-w-sm mx-auto px-1.5 pb-1.5">
      <span>1. Zahl ↓</span>
      <span>2. Zahl →</span>
    </div>

    <div class="grid grid-cols-11 gap-0.5 sm:gap-1 min-w-[280px] max-w-sm mx-auto p-2 bg-[#f6f7f9] dark:bg-[#111113] rounded-[20px] select-none">
      
      <!-- Obere linke Ecke (Operator) -->
      <button
        type="button"
        onclick={() => {
          selectedRowOrCol = null;
          selectedFact = null;
          selectedWorldFilter = 0;
        }}
        title="Auswahl aufheben (Alle anzeigen)"
        aria-label="Auswahl aufheben"
        class="aspect-square rounded-[8px] bg-[#0a6cff] dark:bg-[#4c9aff] dark:text-[#00112b] text-white flex items-center justify-center text-[10px] sm:text-xs font-black border-none cursor-pointer hover:bg-[#2b7fff] transition"
      >
        {gameMode === 'mult' ? '×' : '+'}
      </button>

      <!-- Spalten-Header oben (b = 1..10) -->
      {#each numbers as b}
        {@const isColActive = activeB === b || selectedRowOrCol === b}
        <button
          type="button"
          onclick={() => handleToggleRowOrCol(b)}
          title="{b}er-Reihe auswählen & üben"
          aria-label="{b}er-Reihe auswählen"
          class="aspect-square rounded-[8px] flex items-center justify-center text-[10px] sm:text-[11px] font-extrabold transition-all border-none cursor-pointer active:scale-95 {
            isColActive
              ? 'bg-[#0a6cff] dark:bg-[#4c9aff] dark:text-[#00112b] text-white scale-105 z-10'
              : 'bg-transparent text-[#9aa1ad] dark:text-[#6c6c74] hover:bg-black/[0.05] dark:hover:bg-white/[0.06] hover:text-[#0f1115] dark:hover:text-white'
          }"
        >
          {b}
        </button>
      {/each}

      <!-- Zeilen (a = 1..10) -->
      {#each numbers as a}
        <!-- Zeilen-Header links (a) -->
        {@const isRowActive = activeA === a || selectedRowOrCol === a}
        <button
          type="button"
          onclick={() => handleToggleRowOrCol(a)}
          title="{a}er-Reihe auswählen & üben"
          aria-label="{a}er-Reihe auswählen"
          class="aspect-square rounded-[8px] flex items-center justify-center text-[10px] sm:text-[11px] font-extrabold transition-all border-none cursor-pointer active:scale-95 {
            isRowActive
              ? 'bg-[#0a6cff] dark:bg-[#4c9aff] dark:text-[#00112b] text-white scale-105 z-10'
              : 'bg-transparent text-[#9aa1ad] dark:text-[#6c6c74] hover:bg-black/[0.05] dark:hover:bg-white/[0.06] hover:text-[#0f1115] dark:hover:text-white'
          }"
        >
          {a}
        </button>

        <!-- 10 Datenzellen für Zeile a -->
        {#each numbers as b}
          {@const fact = getFactForCell(a, b)}
          {@const vis = getVisual(a, b)}
          {@const world = fact ? getFactWorld(fact) : 1}
          {@const locked = isFactLocked(fact)}
          {@const isWorldDimmed = selectedWorldFilter > 0 && world !== selectedWorldFilter}
          {@const isRowDimmed = selectedRowOrCol !== null && a !== selectedRowOrCol && b !== selectedRowOrCol}
          {@const isDimmed = isWorldDimmed || isRowDimmed}
          {@const isSelected = selectedFact?.a === a && selectedFact?.b === b}
          {@const isInSelectedRow = selectedRowOrCol !== null && (a === selectedRowOrCol || b === selectedRowOrCol)}
          {@const isInCrosshair = activeA === a || activeB === b}

          <button
            type="button"
            onclick={() => {
              if (fact) {
                if (locked) {
                  lockedPromptFact = fact;
                } else {
                  selectedFact = selectedFact?.id === fact.id ? null : fact;
                  selectedRowOrCol = null;
                }
              }
            }}
            onmouseenter={() => (hoveredCell = { a, b })}
            onmouseleave={() => (hoveredCell = null)}
            class="relative aspect-square rounded-[8px] transition-all cursor-pointer border-none p-0 flex items-center justify-center text-[8px] sm:text-[9.5px] font-black {
              isDimmed
                ? 'opacity-20 grayscale brightness-75 scale-90'
                : 'hover:scale-115 hover:z-20'
            } {
              isSelected
                ? 'ring-2 ring-[#0a6cff] scale-110 z-10'
                : isInSelectedRow
                ? 'ring-1.5 ring-[#0a6cff] scale-102 z-10'
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
                ? 'bg-[#e8f0ff] dark:bg-slate-700 text-[#0f1115] dark:text-white'
                : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 ring-1 ring-inset ring-black/[0.07] dark:ring-white/[0.06] hover:bg-slate-200 dark:hover:bg-slate-700'
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

  <!-- DYNAMISCHE AKTIONS-LEISTE BEI AUSWAHL -->
  {#if selectedFact}
    <!-- 1. Einzelfakt ausgewählt -->
    {@const vis = getFactVisualStatus(selectedFact)}
    <div class="mt-2.5 p-2.5 sm:p-3 bg-[#e8f0ff] dark:bg-[#4c9aff]/15 rounded-2xl border border-[#0a6cff]/25 dark:border-[#4c9aff]/30 flex items-center justify-between gap-2 animate-fade-in shadow-2xs">
      <div class="truncate">
        <div class="text-xs sm:text-sm font-black text-[#0f1115] dark:text-white flex items-center gap-1.5">
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
        <div class="text-[10px] text-[#0a6cff] dark:text-[#4c9aff] font-semibold truncate">
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
          class="shrink-0 px-3 py-1.5 rounded-xl bg-[#0a6cff] hover:bg-[#2b7fff] dark:bg-[#4c9aff] dark:hover:bg-[#6aaeff] dark:text-[#00112b] text-white text-xs font-black border-none cursor-pointer shadow-xs transition"
        >
          🎯 Gezielt üben ({opLabel}) →
        </button>
      {/if}
    </div>
  {:else if selectedRowOrCol !== null}
    <!-- 2. Reihe ausgewählt (z. B. 7er-Reihe) -->
    <div class="mt-2.5 p-2.5 sm:p-3 bg-[#e8f0ff] dark:bg-[#4c9aff]/15 rounded-2xl border-2 border-[#0a6cff]/25 dark:border-[#4c9aff]/30 flex items-center justify-between gap-2 animate-fade-in shadow-sm">
      <div class="truncate min-w-0">
        <div class="text-xs sm:text-sm font-black text-[#0f1115] dark:text-white flex items-center gap-1.5 truncate">
          <span>🎯</span>
          <span>{selectedRowOrCol}er-Reihe ({gameMode === 'mult' ? `Einmaleins mit ${selectedRowOrCol}` : `Rechnen mit ${selectedRowOrCol}`})</span>
        </div>
        <div class="text-[10px] text-[#0a6cff] dark:text-[#4c9aff] font-semibold truncate">
          10 Aufgaben ({opLabel}) gezielt aus der {selectedRowOrCol}er-Reihe trainieren
        </div>
      </div>
      {#if onStartRowSession}
        <button
          type="button"
          onclick={() => {
            const row = selectedRowOrCol;
            if (row !== null) {
              onStartRowSession(row);
            }
          }}
          class="shrink-0 px-3.5 py-2 rounded-xl bg-[#0a6cff] hover:bg-[#2b7fff] dark:bg-[#4c9aff] dark:hover:bg-[#6aaeff] dark:text-[#00112b] text-white text-xs font-black border-none cursor-pointer shadow-sm transition flex items-center gap-1.5 tactile-btn"
        >
          <span>▶</span>
          <span>Reihe üben</span>
        </button>
      {/if}
    </div>
  {:else if selectedWorldFilter > 0}
    <!-- 3. Welt ausgewählt (Welt 1, 2 oder 3) -->
    {@const activeChapter = chapters[selectedWorldFilter - 1]}
    {@const isLocked = selectedWorldFilter > unlockedWorldCount}
    {#if activeChapter}
      <div class="mt-2.5 p-2.5 sm:p-3 bg-[#e8f0ff] dark:bg-[#4c9aff]/15 rounded-2xl border-2 border-[#0a6cff]/25 dark:border-[#4c9aff]/30 flex items-center justify-between gap-2 animate-fade-in shadow-sm">
        <div class="truncate min-w-0">
          <div class="text-xs sm:text-sm font-black text-[#0f1115] dark:text-white flex items-center gap-1.5 truncate">
            <span class="text-base">{activeChapter.icon}</span>
            <span>{activeChapter.title}</span>
            {#if isLocked}
              <span class="text-xs">🔒</span>
            {/if}
          </div>
          <div class="text-[10px] text-[#0a6cff] dark:text-[#4c9aff] font-semibold truncate">
            {activeChapter.subtitle} · Modus: {opLabel}
          </div>
        </div>
        {#if onStartChapterSession}
          {#if isLocked}
            <button
              type="button"
              onclick={() => {
                lockedPromptFact = activeChapter.facts[0];
              }}
              class="shrink-0 px-3 py-2 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-xs font-bold border-none cursor-pointer flex items-center gap-1"
            >
              <span>🔒 Gesperrt</span>
            </button>
          {:else}
            <button
              type="button"
              onclick={() => {
                onStartChapterSession(activeChapter);
              }}
              class="shrink-0 px-3.5 py-2 rounded-xl bg-[#0a6cff] hover:bg-[#2b7fff] dark:bg-[#4c9aff] dark:hover:bg-[#6aaeff] dark:text-[#00112b] text-white text-xs font-black border-none cursor-pointer shadow-sm transition flex items-center gap-1.5 tactile-btn"
            >
              <span>▶</span>
              <span>Welt {selectedWorldFilter} üben</span>
            </button>
          {/if}
        {/if}
      </div>
    {/if}
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
    <div class="w-full max-w-sm bg-white dark:bg-[#1c1c1e] border-2 border-[#0a6cff]/25 dark:border-[#4c9aff]/30 rounded-3xl p-5 shadow-2xl space-y-3.5 animate-scale-up text-center">
      <div class="w-12 h-12 rounded-2xl bg-[#e8f0ff] dark:bg-[#4c9aff]/15 text-[#0a6cff] dark:text-[#4c9aff] text-2xl flex items-center justify-center mx-auto shadow-2xs">
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
        class="w-full py-2.5 px-4 bg-[#0a6cff] hover:bg-[#2b7fff] dark:bg-[#4c9aff] dark:hover:bg-[#6aaeff] dark:text-[#00112b] text-white text-xs font-black rounded-xl border-none cursor-pointer shadow-xs"
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
    <div class="w-full max-w-md bg-white dark:bg-[#1c1c1e] border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl max-h-[90dvh] overflow-y-auto space-y-4">
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
