<script lang="ts">
  import { getFactMastery, getFactVisualStatus } from '../lib/sm2';
  import { getAccessibleFactsPoolV3, getFactWorld } from '../lib/chapters';
  import type { FactFamily, FactVisualStatus, GameMode, MasteryStatus, TaskVariant } from '../lib/types';

  interface Props {
    gameMode: GameMode;
    facts: FactFamily[];
    onSwitchGameMode: (mode: GameMode) => void;
    onPracticeFact: (fact: FactFamily) => void;
    onBack: () => void;
  }

  let {
    gameMode,
    facts,
    onSwitchGameMode,
    onPracticeFact,
    onBack,
  }: Props = $props();

  const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  let selectedFact = $state<FactFamily | null>(null);
  let hoveredCell = $state<{ a: number; b: number } | null>(null);
  let activeFilter = $state<'none' | 'squares' | 'core' | 'bonds10' | 'doubles'>('none');
  let selectedWorldFilter = $state<0 | 1 | 2 | 3>(0);
  let lockedPromptFact = $state<FactFamily | null>(null);
  let showLegendModal = $state(false);

  let accessiblePool = $derived(getAccessibleFactsPoolV3(facts, gameMode));
  let unlockedWorldCount = $derived(accessiblePool.unlockedWorldCount);

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

  function getFact(a: number, b: number): FactFamily | undefined {
    return facts.find((f) => f.a === a && f.b === b);
  }

  function getStatus(a: number, b: number): MasteryStatus {
    const f = getFact(a, b);
    return f ? getFactMastery(f) : 'new';
  }

  function getVisual(a: number, b: number): FactVisualStatus {
    const f = getFact(a, b);
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

  function isHighlighted(a: number, b: number): boolean {
    if (activeFilter === 'none') return false;
    if (activeFilter === 'squares' || activeFilter === 'doubles') return a === b;
    if (activeFilter === 'bonds10') return a + b === 10;
    if (activeFilter === 'core') {
      return a === 1 || a === 2 || a === 5 || a === 10 || b === 1 || b === 2 || b === 5 || b === 10;
    }
    return false;
  }

  function toggleFilter(filter: 'squares' | 'core' | 'bonds10' | 'doubles') {
    activeFilter = activeFilter === filter ? 'none' : filter;
  }

  let activeA = $derived(hoveredCell?.a ?? selectedFact?.a ?? null);
  let activeB = $derived(hoveredCell?.b ?? selectedFact?.b ?? null);

  let counts = $derived.by(() => {
    let crowns = 0;
    let step3 = 0;
    let step2 = 0;
    let step1 = 0;
    let learning = 0;
    let wrongSoft = 0;
    let wrongHard = 0;
    let fresh = 0;

    for (const f of facts) {
      const vis = getFactVisualStatus(f);
      if (vis.hasCrown) crowns++;
      if (vis.level === 'green_step3') step3++;
      else if (vis.level === 'green_step2') step2++;
      else if (vis.level === 'green_step1') step1++;
      else if (vis.level === 'wrong_hard') wrongHard++;
      else if (vis.level === 'wrong_soft') wrongSoft++;
      else if (vis.level === 'learning') learning++;
      else fresh++;
    }
    return { crowns, step3, step2, step1, learning, wrongSoft, wrongHard, fresh };
  });

  function getVariantName(v: TaskVariant): string {
    switch (v) {
      case 'mult':
        return 'Malnehmen (a × b = ?)';
      case 'div':
        return 'Geteilt / Umkehrung (c : b = ?)';
      case 'gap_mult_b':
        return 'Lückenaufgabe (a × ? = c)';
      case 'gap_mult_a':
        return 'Lückenaufgabe (? × b = c)';
      case 'gap_div_c':
        return 'Geteilt-Lücke (? : b = a)';
      case 'gap_div_a':
        return 'Geteilt-Lücke (c : ? = b)';
      case 'add':
        return 'Plusaufgabe (a + b = ?)';
      case 'sub':
        return 'Minusaufgabe (c − b = ?)';
      case 'gap_add_b':
        return 'Ergänzen (a + ? = c)';
      case 'gap_add_a':
        return 'Plus-Lücke (? + b = c)';
      case 'gap_sub_b':
        return 'Minus-Lücke (c − ? = a)';
      case 'gap_sub_c':
        return 'Minus-Lücke (? − b = a)';
    }
  }
</script>

<div class="w-full max-w-2xl mx-auto space-y-4 pb-8">
  <!-- Header -->
  <div class="flex items-center justify-between bg-white dark:bg-[#111827] rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs">
    <div>
      <h2 class="text-base font-extrabold text-slate-900 dark:text-white m-0">
        {gameMode === 'mult' ? 'Große 1×1-Tafel' : 'Große Zahlen-Held-Tafel'}
      </h2>
      <p class="text-xs text-slate-400 m-0">
        Alle 100 Fakten im didaktischen Stufen- & Fehler-Status
      </p>
    </div>

    <div class="flex items-center gap-2">
      <button
        type="button"
        onclick={() => (showLegendModal = true)}
        class="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold border border-indigo-200/70 dark:border-indigo-800/60 cursor-pointer flex items-center gap-1.5 transition"
      >
        <span>ℹ️</span>
        <span>Legende</span>
      </button>

      <button
        type="button"
        onclick={onBack}
        class="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-200 text-xs font-bold border-none cursor-pointer"
      >
        ← Zurück
      </button>
    </div>
  </div>

  <!-- Modus-Umschalter -->
  <div class="grid grid-cols-2 gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl">
    <button
      type="button"
      onclick={() => onSwitchGameMode('plusminus')}
      class="py-2 rounded-xl text-xs font-extrabold border-none cursor-pointer transition {
        gameMode === 'plusminus'
          ? 'bg-white dark:bg-[#111827] text-indigo-600 dark:text-indigo-400 shadow-xs'
          : 'bg-transparent text-slate-600 dark:text-slate-400'
      }"
    >
      ➕ Zahlen-Held (+ / −)
    </button>
    <button
      type="button"
      onclick={() => onSwitchGameMode('mult')}
      class="py-2 rounded-xl text-xs font-extrabold border-none cursor-pointer transition {
        gameMode === 'mult'
          ? 'bg-white dark:bg-[#111827] text-indigo-600 dark:text-indigo-400 shadow-xs'
          : 'bg-transparent text-slate-600 dark:text-slate-400'
      }"
    >
      ✖️ 1×1 Meister (× / :)
    </button>
  </div>

  <!-- Status-Kacheln mit didaktischen Stufen -->
  <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
    <div class="bg-amber-50/80 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-800/60 p-2.5 rounded-2xl flex flex-col justify-center">
      <div class="flex items-center justify-center gap-1">
        <span class="text-base">👑</span>
        <span class="text-lg font-black text-amber-700 dark:text-amber-300">{counts.crowns}</span>
      </div>
      <span class="text-[10px] text-amber-800 dark:text-amber-300 font-bold uppercase">Langzeit-Krone</span>
    </div>

    <div class="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 p-2.5 rounded-2xl flex flex-col justify-center">
      <div class="flex items-center justify-center gap-2.5">
        <div class="flex items-center gap-1 font-black" title="Stufe 3 (Dunkelgrüner Kreis - Lücke)">
          <span class="w-2.5 h-2.5 rounded-full bg-emerald-800 dark:bg-emerald-800 shrink-0"></span>
          <span class="text-xs text-emerald-900 dark:text-emerald-500">{counts.step3}</span>
        </div>
        <div class="flex items-center gap-1 font-black" title="Stufe 2 (Mittelgrüner Kreis - Umkehr)">
          <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 dark:bg-emerald-600 shrink-0"></span>
          <span class="text-xs text-emerald-700 dark:text-emerald-400">{counts.step2}</span>
        </div>
        <div class="flex items-center gap-1 font-bold" title="Stufe 1 (Hellgrüner Kreis - Basis)">
          <span class="w-2.5 h-2.5 rounded-full bg-emerald-300 dark:bg-emerald-400 shrink-0"></span>
          <span class="text-xs text-emerald-600 dark:text-emerald-300">{counts.step1}</span>
        </div>
      </div>
      <span class="text-[10px] text-emerald-800 dark:text-emerald-300 font-bold uppercase mt-0.5">
        Grün-Stufen ({counts.step3 + counts.step2 + counts.step1})
      </span>
    </div>

    <div class="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 p-2.5 rounded-2xl flex flex-col justify-center">
      <div class="flex items-center justify-center gap-2">
        {#if counts.wrongHard > 0}
          <div class="flex items-center gap-1 text-rose-600 dark:text-rose-400 font-black" title="Wackelkandidaten (Dunkelrot)">
            <span>🚨</span>
            <span class="text-sm">{counts.wrongHard}</span>
          </div>
        {/if}
        {#if counts.wrongSoft > 0}
          <div class="flex items-center gap-1 text-rose-500 dark:text-rose-300 font-bold" title="Kürzliche Fehler (Rosa)">
            <span>🌸</span>
            <span class="text-sm">{counts.wrongSoft}</span>
          </div>
        {/if}
      </div>
      <span class="text-[10px] text-rose-800 dark:text-rose-300 font-bold uppercase mt-0.5">Wiederholen</span>
    </div>

    <div class="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 p-2.5 rounded-2xl flex flex-col justify-center">
      <div class="flex items-center justify-center gap-2">
        <span class="text-xs font-bold text-amber-600 dark:text-amber-400" title="Im Lernprozess">⚡ {counts.learning}</span>
        <span class="text-sm font-black text-slate-600 dark:text-slate-400" title="Noch unentdeckt">○ {counts.fresh}</span>
      </div>
      <span class="text-[10px] text-slate-500 font-bold uppercase">Lernen / Neu</span>
    </div>
  </div>

  <!-- Filter-Leiste & Didaktische Hilfen -->
  <div class="flex items-center justify-between flex-wrap gap-2 px-1">
    <div class="flex items-center gap-1.5 flex-wrap">
      <span class="text-[11px] font-extrabold text-slate-400">Didaktische Muster:</span>
      {#if gameMode === 'mult'}
        <button
          type="button"
          onclick={() => toggleFilter('squares')}
          class="text-xs font-bold px-2.5 py-1 rounded-xl border cursor-pointer transition {
            activeFilter === 'squares'
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
          }"
        >
          💡 Quadratzahlen (a = b)
        </button>
        <button
          type="button"
          onclick={() => toggleFilter('core')}
          class="text-xs font-bold px-2.5 py-1 rounded-xl border cursor-pointer transition {
            activeFilter === 'core'
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
          }"
        >
          ⭐ Kernaufgaben (1, 2, 5, 10)
        </button>
      {:else}
        <button
          type="button"
          onclick={() => toggleFilter('bonds10')}
          class="text-xs font-bold px-2.5 py-1 rounded-xl border cursor-pointer transition {
            activeFilter === 'bonds10'
              ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
          }"
        >
          ❤️ Verliebte Zahlen (=10)
        </button>
        <button
          type="button"
          onclick={() => toggleFilter('doubles')}
          class="text-xs font-bold px-2.5 py-1 rounded-xl border cursor-pointer transition {
            activeFilter === 'doubles'
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
          }"
        >
          ⚡ Verdoppeln (a = b)
        </button>
      {/if}
    </div>

    <span class="text-[11px] text-slate-400 font-semibold">
      Zeile (links) {gameMode === 'mult' ? '×' : '+'} Spalte (oben)
    </span>
  </div>

  <!-- Welten-Filter / Radar (Didaktik & Paywall Transparenz) -->
  <div class="space-y-1.5 px-1">
    <div class="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
      <button
        type="button"
        onclick={() => (selectedWorldFilter = 0)}
        class="text-[10px] font-extrabold px-2.5 py-1 rounded-xl border transition cursor-pointer shrink-0 {
          selectedWorldFilter === 0
            ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400'
        }"
      >
        Alle (100)
      </button>

      <button
        type="button"
        onclick={() => (selectedWorldFilter = 1)}
        class="text-[10px] font-extrabold px-2.5 py-1 rounded-xl border transition cursor-pointer shrink-0 flex items-center gap-1 {
          selectedWorldFilter === 1
            ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400'
        }"
      >
        <span>🥉</span>
        <span>Welt 1 ({gameMode === 'mult' ? 'Kern: 64' : 'Basis: 45'})</span>
      </button>

      <button
        type="button"
        onclick={() => (selectedWorldFilter = 2)}
        class="text-[10px] font-extrabold px-2.5 py-1 rounded-xl border transition cursor-pointer shrink-0 flex items-center gap-1 {
          selectedWorldFilter === 2
            ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400'
        }"
      >
        <span>🥈</span>
        <span>Welt 2 ({gameMode === 'mult' ? 'Forscher: 20' : 'Doppelgänger: 15'})</span>
        {#if unlockedWorldCount < 2}
          <span class="text-[9px]">🔒</span>
        {/if}
      </button>

      <button
        type="button"
        onclick={() => (selectedWorldFilter = 3)}
        class="text-[10px] font-extrabold px-2.5 py-1 rounded-xl border transition cursor-pointer shrink-0 flex items-center gap-1 {
          selectedWorldFilter === 3
            ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400'
        }"
      >
        <span>🥇</span>
        <span>Welt 3 ({gameMode === 'mult' ? 'Königsaufgaben: 16' : 'Zehnerstopp: 40'})</span>
        {#if unlockedWorldCount < 3}
          <span class="text-[9px]">🔒</span>
        {/if}
      </button>
    </div>

    {#if selectedWorldFilter === 1}
      <div class="text-[10.5px] text-slate-700 dark:text-slate-200 bg-indigo-50/80 dark:bg-indigo-950/50 p-2 rounded-xl border border-indigo-200/60 dark:border-indigo-800/60 animate-fade-in flex items-center gap-2">
        <span class="text-base shrink-0">🥉</span>
        <span><strong>Welt 1 ({gameMode === 'mult' ? 'Kernaufgaben' : 'Basis bis 10'}):</strong> {gameMode === 'mult' ? 'Reihen 1, 2, 5 und 10 bilden das solide Kreuz-Skelett der 100er-Tafel.' : 'Alle 45 Zerlegungen bis 10 bilden das unverzichtbare Fundament.'}</span>
      </div>
    {:else if selectedWorldFilter === 2}
      <div class="text-[10.5px] text-slate-700 dark:text-slate-200 bg-indigo-50/80 dark:bg-indigo-950/50 p-2 rounded-xl border border-indigo-200/60 dark:border-indigo-800/60 animate-fade-in flex items-center gap-2">
        <span class="text-base shrink-0">🥈</span>
        <span><strong>Welt 2 ({gameMode === 'mult' ? 'Forscherreihen' : 'Doppelgänger & Nachbarn'}):</strong> {gameMode === 'mult' ? 'Reihen 3 & 4 nutzen geschicktes Verdoppeln und Nachbar-Beziehungen zur Basis.' : 'Verdoppeln und Nachbaraufgaben bis 20 festigen Zwischenschritte.'}</span>
      </div>
    {:else if selectedWorldFilter === 3}
      <div class="text-[10.5px] text-amber-900 dark:text-amber-200 bg-amber-50/80 dark:bg-amber-950/50 p-2 rounded-xl border border-amber-200/60 dark:border-amber-800/60 animate-fade-in flex items-center gap-2">
        <span class="text-base shrink-0">🥇</span>
        <span><strong>Welt 3 ({gameMode === 'mult' ? 'Königsaufgaben' : 'Zehnerübergang'}):</strong> {gameMode === 'mult' ? 'Die 16 anspruchsvollsten Königsaufgaben der Reihen 6, 7, 8 und 9 (z. B. 7 × 8 = 56).' : 'Der Zehnerübergang (Zehnerstopp über die 10, z. B. 8 + 5 = 13).'}</span>
      </div>
    {/if}
  </div>

  <!-- Große 11x11 Matrix -->
  <div class="bg-white dark:bg-[#111827] rounded-3xl p-3 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-x-auto">
    <!-- Achsen-Beschriftung zur Orientierung -->
    <div class="flex items-center justify-between text-xs text-indigo-600 dark:text-indigo-400 font-extrabold max-w-xl mx-auto px-2 pb-1.5">
      <span>↓ Zeile (erste Zahl)</span>
      <span>Spalte (zweite Zahl) →</span>
    </div>

    <div class="min-w-[340px] max-w-xl mx-auto">
      <div class="grid grid-cols-11 gap-1 sm:gap-1.5 p-1.5 sm:p-2 bg-slate-100 dark:bg-slate-900 rounded-2xl select-none">
        
        <!-- Obere linke Ecke -->
        <div class="aspect-square rounded-xl bg-indigo-600 dark:bg-indigo-500 text-white flex items-center justify-center text-xs sm:text-base font-black shadow-sm ring-1 ring-indigo-400">
          {gameMode === 'mult' ? '×' : '+'}
        </div>

        <!-- Spalten-Header oben (b = 1..10) -->
        {#each numbers as b}
          {@const isColActive = activeB === b}
          <div class="aspect-square rounded-xl flex items-center justify-center text-xs sm:text-sm font-black transition-all {
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
          <div class="aspect-square rounded-xl flex items-center justify-center text-xs sm:text-sm font-black transition-all {
            isRowActive
              ? 'bg-indigo-600 dark:bg-indigo-500 text-white border-indigo-600 dark:border-indigo-500 shadow-md ring-2 ring-indigo-400 scale-105 z-10'
              : 'bg-indigo-100/90 dark:bg-indigo-950/70 border border-indigo-300/80 dark:border-indigo-700/80 text-indigo-950 dark:text-indigo-100 shadow-2xs'
          }">
            {a}
          </div>

          <!-- 10 Datenzellen für Zeile a -->
          {#each numbers as b}
            {@const f = getFact(a, b)}
            {@const vis = getVisual(a, b)}
            {@const world = f ? getFactWorld(f) : 1}
            {@const locked = isFactLocked(f)}
            {@const isDimmed = selectedWorldFilter > 0 && world !== selectedWorldFilter}
            {@const isSelected = selectedFact?.a === a && selectedFact?.b === b}
            {@const isHL = isHighlighted(a, b)}
            {@const isInCrosshair = activeA === a || activeB === b}

            <button
              type="button"
              onclick={() => {
                if (f) {
                  if (locked) {
                    lockedPromptFact = f;
                  } else {
                    selectedFact = f;
                  }
                }
              }}
              onmouseenter={() => (hoveredCell = { a, b })}
              onmouseleave={() => (hoveredCell = null)}
              class="relative aspect-square rounded-xl flex items-center justify-center text-xs sm:text-sm font-black transition-all cursor-pointer border-none {
                isDimmed
                  ? 'opacity-20 grayscale brightness-75 scale-90'
                  : 'hover:scale-115 hover:z-20'
              } {
                isSelected
                  ? 'ring-3 ring-indigo-500 scale-110 z-10'
                  : isHL
                  ? 'ring-2 ring-amber-400 z-10'
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
                  ? 'bg-indigo-100/80 dark:bg-slate-700 text-indigo-900 dark:text-indigo-200'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
              }"
              title="{a} {gameMode === 'mult' ? '×' : '+'} {b} = {f?.c} ({locked ? 'Gesperrt' : `${vis.badge} ${vis.label}`})"
              aria-label="{a} {gameMode === 'mult' ? 'mal' : 'plus'} {b} ist {f?.c}"
            >
              {#if locked}
                <span class="text-xs sm:text-sm">🔒</span>
              {:else}
                <span class="truncate">{f ? f.c : ''}</span>
                {#if vis.hasCrown}
                  <span class="absolute -top-1 -right-0.5 text-[8px] sm:text-[10px] leading-none pointer-events-none drop-shadow">
                    👑
                  </span>
                {:else if world === 3}
                  <span class="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-amber-400 pointer-events-none" title="Königsaufgabe"></span>
                {/if}
              {/if}
            </button>
          {/each}
        {/each}
      </div>
    </div>
  </div>
</div>

<!-- FAKTEN-DETAIL MODAL -->
{#if selectedFact}
  {@const vis = getFactVisualStatus(selectedFact)}
  <div
    class="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in"
    onclick={(e) => {
      if (e.target === e.currentTarget) selectedFact = null;
    }}
    onkeydown={(e) => {
      if (e.key === 'Escape') selectedFact = null;
    }}
    tabindex="-1"
    role="dialog"
    aria-modal="true"
    aria-label="Fakten-Details"
  >
    <div class="w-full max-w-sm bg-white dark:bg-[#111827] border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4">
      <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <span class="text-[10px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
            Fakten-Familie
          </span>
          <h3 class="text-2xl font-black text-slate-900 dark:text-white m-0 flex items-center gap-2">
            <span>{selectedFact.a} {selectedFact.mode === 'mult' ? '×' : '+'} {selectedFact.b} = {selectedFact.c}</span>
            {#if vis.hasCrown}
              <span>👑</span>
            {:else if vis.level === 'green_step3'}
              <span class="inline-block w-4 h-4 rounded-full bg-emerald-800 dark:bg-emerald-800 border-2 border-emerald-950 dark:border-emerald-600 shrink-0 shadow-xs" title="Stufe 3 (Dunkelgrüner Kreis)"></span>
            {:else if vis.level === 'green_step2'}
              <span class="inline-block w-4 h-4 rounded-full bg-emerald-500 dark:bg-emerald-600 border-2 border-emerald-700 dark:border-emerald-400 shrink-0 shadow-xs" title="Stufe 2 (Mittelgrüner Kreis)"></span>
            {:else if vis.level === 'green_step1'}
              <span class="inline-block w-4 h-4 rounded-full bg-emerald-300 dark:bg-emerald-400 border-2 border-emerald-500 dark:border-emerald-200 shrink-0 shadow-xs" title="Stufe 1 (Hellgrüner Kreis)"></span>
            {:else}
              <span>{vis.badge}</span>
            {/if}
          </h3>
        </div>
        <button
          type="button"
          onclick={() => (selectedFact = null)}
          class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 text-xs font-bold border-none cursor-pointer flex items-center justify-center"
        >
          ✕
        </button>
      </div>

      <!-- Stats Grid -->
      <div class="grid grid-cols-3 gap-2 text-center text-xs bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-2xl">
        <div>
          <span class="text-[9px] text-slate-400 block font-bold uppercase">Status</span>
          <span class="font-extrabold text-slate-800 dark:text-slate-200">
            {vis.label}
          </span>
        </div>
        <div>
          <span class="text-[9px] text-slate-400 block font-bold uppercase">Versuche</span>
          <span class="font-extrabold text-slate-800 dark:text-slate-200">
            {selectedFact.correctAttempts} / {selectedFact.totalAttempts}
          </span>
        </div>
        <div>
          <span class="text-[9px] text-slate-400 block font-bold uppercase">Intervall</span>
          <span class="font-extrabold text-indigo-600 dark:text-indigo-400 flex items-center justify-center gap-1">
            {#if vis.hasCrown}
              <span>👑</span>
            {/if}
            <span>{selectedFact.interval} Tag(e)</span>
          </span>
        </div>
      </div>

      <!-- Transferformen -->
      <div>
        <span class="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1.5">
          Gemeisterte Abfrageformen ({selectedFact.masteredVariants.length}):
        </span>
        {#if selectedFact.masteredVariants.length === 0}
          <div class="text-xs text-slate-400 italic bg-slate-50 dark:bg-slate-800/30 p-2 rounded-xl">
            Noch keine Form sicher gemeistert.
          </div>
        {:else}
          <div class="space-y-1">
            {#each selectedFact.masteredVariants as mv}
              <div class="flex items-center justify-between text-xs font-semibold p-2 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border border-emerald-200/50 dark:border-emerald-800/40">
                <span>{getVariantName(mv)}</span>
                <span class="font-black">✓</span>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Action Button -->
      <button
        type="button"
        onclick={() => {
          const f = selectedFact;
          selectedFact = null;
          if (f) onPracticeFact(f);
        }}
        class="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition btn-calm-primary cursor-pointer border-none"
      >
        <span>🎯</span>
        <span>Diesen Fakt jetzt gezielt üben</span>
      </button>
    </div>
  </div>
{/if}

<!-- MODAL: INTERAKTIVE FARB-LEGENDE -->
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
    aria-label="Farb-Legende der Rechentafel"
  >
    <div class="w-full max-w-md bg-white dark:bg-[#111827] border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl max-h-[90dvh] overflow-y-auto space-y-4">
      <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h3 class="text-base font-extrabold text-slate-900 dark:text-white m-0">
            🗺️ Farb-Legende der Rechentafel
          </h3>
          <p class="text-xs text-slate-400 m-0">
            Was bedeuten die Farben und Symbole?
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
              Höchste Auszeichnung! Alle 3 Stufen gemeistert und im Langzeit-Spaced-Repetition über Wochen verankert (Intervall ≥ 14 Tage).
            </div>
          </div>
        </div>

        <!-- Dunkelgrün (Stufe 3) -->
        <div class="flex items-start gap-3 p-2.5 rounded-2xl bg-emerald-900/10 dark:bg-emerald-950/30 border border-emerald-800/30 dark:border-emerald-800/60">
          <div class="w-6 h-6 rounded-full bg-emerald-800 dark:bg-emerald-800 text-white font-black text-xs flex items-center justify-center shrink-0 border border-emerald-950 dark:border-emerald-700 shadow-xs">
            3
          </div>
          <div>
            <div class="font-black text-emerald-950 dark:text-emerald-400 flex items-center gap-1.5">
              <span>Sattes Dunkelgrün · Stufe 3 (Meister-Können)</span>
              <span class="inline-block w-2.5 h-2.5 rounded-full bg-emerald-800 dark:bg-emerald-800 border border-emerald-950 dark:border-emerald-600"></span>
            </div>
            <div class="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">
              Auch flexible Lückenaufgaben ({gameMode === 'mult' ? '3 × ? = 21' : '4 + ? = 10'}) erfolgreich gemeistert!
            </div>
          </div>
        </div>

        <!-- Mittelgrün (Stufe 2) -->
        <div class="flex items-start gap-3 p-2.5 rounded-2xl bg-emerald-500/10 dark:bg-emerald-950/20 border border-emerald-500/30 dark:border-emerald-700/50">
          <div class="w-6 h-6 rounded-full bg-emerald-500 dark:bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0 border border-emerald-700 dark:border-emerald-500 shadow-xs">
            2
          </div>
          <div>
            <div class="font-black text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
              <span>Mittelgrün · Stufe 2 (Umkehr-Können)</span>
              <span class="inline-block w-2.5 h-2.5 rounded-full bg-emerald-500 dark:bg-emerald-600 border border-emerald-700 dark:border-emerald-400"></span>
            </div>
            <div class="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">
              Gegenrichtung ({gameMode === 'mult' ? 'Geteilt: 21 : 3 = 7' : 'Minus: 10 − 4 = 6'}) sicher verstanden und gelöst!
            </div>
          </div>
        </div>

        <!-- Hellgrün (Stufe 1) -->
        <div class="flex items-start gap-3 p-2.5 rounded-2xl bg-emerald-300/15 dark:bg-emerald-950/20 border border-emerald-400/40 dark:border-emerald-600/40">
          <div class="w-6 h-6 rounded-full bg-emerald-300 dark:bg-emerald-400 text-emerald-950 font-black text-xs flex items-center justify-center shrink-0 border border-emerald-500 dark:border-emerald-300 shadow-xs">
            1
          </div>
          <div>
            <div class="font-black text-emerald-700 dark:text-emerald-200 flex items-center gap-1.5">
              <span>Hellgrün · Stufe 1 (Basis-Können)</span>
              <span class="inline-block w-2.5 h-2.5 rounded-full bg-emerald-300 dark:bg-emerald-400 border border-emerald-500 dark:border-emerald-200"></span>
            </div>
            <div class="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">
              Normale Grundaufgabe ({gameMode === 'mult' ? '3 × 7 = 21' : '4 + 6 = 10'}) sitzt sicher im Kopf!
            </div>
          </div>
        </div>

        <!-- Gelb -->
        <div class="flex items-start gap-3 p-2.5 rounded-2xl bg-amber-400/10 dark:bg-amber-950/20 border border-amber-400/30 dark:border-amber-700/50">
          <div class="w-6 h-6 rounded-full bg-amber-300 dark:bg-amber-400 text-amber-950 font-black text-xs flex items-center justify-center shrink-0">
            ⚡
          </div>
          <div>
            <div class="font-black text-amber-900 dark:text-amber-300">
              Gelb · Im Lernprozess
            </div>
            <div class="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">
              1x richtig gerechnet, wird aktuell geübt und gefestigt.
            </div>
          </div>
        </div>

        <!-- Rosa / Soft-Rot -->
        <div class="flex items-start gap-3 p-2.5 rounded-2xl bg-rose-300/15 dark:bg-rose-950/30 border border-rose-300/40 dark:border-rose-800/60">
          <div class="w-6 h-6 rounded-full bg-rose-200 dark:bg-rose-300 text-rose-900 dark:text-rose-950 font-black text-xs flex items-center justify-center shrink-0">
            🌸
          </div>
          <div>
            <div class="font-black text-rose-800 dark:text-rose-300 flex items-center gap-1.5">
              <span>Zartes Rosa · Kürzlicher Fehler</span>
              <span>🌸</span>
            </div>
            <div class="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">
              Einmaliger Rechenfehler oder Vertipper – kommt bald zur Wiederholung.
            </div>
          </div>
        </div>

        <!-- Dunkelrot -->
        <div class="flex items-start gap-3 p-2.5 rounded-2xl bg-rose-600/10 dark:bg-rose-950/50 border border-rose-600/30 dark:border-rose-700/70">
          <div class="w-6 h-6 rounded-full bg-rose-600 dark:bg-rose-600 text-white font-black text-xs flex items-center justify-center shrink-0 animate-pulse">
            🚨
          </div>
          <div>
            <div class="font-black text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
              <span>Dunkelrot · Wackelkandidat</span>
              <span>🚨</span>
            </div>
            <div class="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 leading-snug">
              Mehrfache Fehlversuche – kann gezielt über „Wackelkandidaten“ geübt werden.
            </div>
          </div>
        </div>

        <!-- Grau / Weiß -->
        <div class="flex items-start gap-3 p-2.5 rounded-2xl bg-slate-100 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
          <div class="w-6 h-6 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-500 font-black text-xs flex items-center justify-center shrink-0">
            ○
          </div>
          <div>
            <div class="font-black text-slate-700 dark:text-slate-300">
              Weiß / Grau · Noch neu
            </div>
            <div class="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
              Aufgabe wurde noch nicht entdeckt.
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        onclick={() => (showLegendModal = false)}
        class="w-full mt-2 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs border-none cursor-pointer"
      >
        Verstanden
      </button>
    </div>
  </div>
{/if}

<!-- MODAL: HINWEIS BEI GESPERRTEM FAKT (DIDAKTIK & PAYWALL) -->
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
    <div class="w-full max-w-sm bg-white dark:bg-[#111827] border-2 border-indigo-200 dark:border-indigo-800 rounded-3xl p-5 shadow-2xl space-y-3.5 animate-scale-up text-center">
      <div class="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 text-2xl flex items-center justify-center mx-auto shadow-2xs">
        🔒
      </div>
      <div>
        <h3 class="text-sm font-black text-slate-900 dark:text-white m-0">
          {getWorldTitle(w)}
        </h3>
        <p class="text-xs text-slate-500 dark:text-slate-400 mt-1 m-0 leading-relaxed">
          Diese Aufgabe ({lockedPromptFact.a} {gameMode === 'mult' ? '×' : '+'} {lockedPromptFact.b}) gehört zu <strong>{getWorldTitle(w)}</strong>.
        </p>
      </div>
      <div class="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 text-left space-y-1">
        <span class="font-extrabold block">🛡️ Didaktischer Schutz &amp; Freischaltung:</span>
        <span class="text-[11px] leading-snug block">
          Um Überforderung zu vermeiden, schaltet sich dieser Bereich automatisch frei, sobald die vorherige Welt zu 80% beherrscht wird (oder in der Vollversion).
        </span>
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
