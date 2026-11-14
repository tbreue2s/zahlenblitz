<script lang="ts">
  import {
    getWorldChaptersV3,
    type WorldChapterV3,
  } from '../lib/chapters';
  import { countDueFactsV3, getWeakSpotFactsV3 } from '../lib/storage';
  import { getFactVisualStatus } from '../lib/sm2';
  import type { FactFamily, GameMode, UserProfileV3, UserStatsV3 } from '../lib/types';
  import ParentalGateModal from './ParentalGateModal.svelte';

  interface Props {
    gameMode: GameMode;
    facts: FactFamily[];
    stats: UserStatsV3;
    activeProfile: UserProfileV3;
    profiles: UserProfileV3[];
    soundEnabled: boolean;
    onSwitchGameMode: (mode: GameMode) => void;
    onSelectProfile: (id: string) => void;
    onToggleSound: () => void;
    onStartDailySession: () => void;
    onStartWeakSpots: () => void;
    onStartBlitz: () => void;
    onStartChapterSession: (chapter: WorldChapterV3) => void;
    onPracticeFact: (fact: FactFamily) => void;
    onOpenMatrix: () => void;
    onOpenUsers: () => void;
    onOpenLegal: () => void;
  }

  let {
    gameMode,
    facts,
    stats,
    activeProfile,
    profiles,
    soundEnabled,
    onSwitchGameMode,
    onSelectProfile,
    onToggleSound,
    onStartDailySession,
    onStartWeakSpots,
    onStartBlitz,
    onStartChapterSession,
    onPracticeFact,
    onOpenMatrix,
    onOpenUsers,
    onOpenLegal,
  }: Props = $props();

  let chapters = $derived(getWorldChaptersV3(facts, gameMode));
  let dueCount = $derived(countDueFactsV3(facts));
  let weakSpotCount = $derived(getWeakSpotFactsV3(facts).length);

  let selectedChapterId = $state<string | null>(null);
  let selectedChapter = $derived(
    selectedChapterId
      ? chapters.find((c) => c.id === selectedChapterId) ?? null
      : null
  );

  let showUserDropdown = $state(false);
  let showParentalGate = $state(false);

  let masteryStats = $derived.by(() => {
    let crowns = 0;
    let greenSteps = 0;
    let wrong = 0;
    let learning = 0;
    for (const f of facts) {
      const vis = getFactVisualStatus(f);
      if (vis.hasCrown) crowns++;
      if (vis.level === 'green_step1' || vis.level === 'green_step2' || vis.level === 'green_step3') {
        greenSteps++;
      } else if (vis.level === 'wrong_hard' || vis.level === 'wrong_soft') {
        wrong++;
      } else if (vis.level === 'learning') {
        learning++;
      }
    }
    const percent = Math.round((greenSteps / (facts.length || 100)) * 100);
    return { crowns, greenSteps, wrong, learning, percent };
  });
</script>

<div class="w-full max-w-lg mx-auto space-y-3.5 pb-8">
  <!-- 1. KOPFZEILE MIT PROFIL, STREAK, STERNE & EINSTELLUNGEN -->
  <header class="flex items-center justify-between bg-white dark:bg-[#111827] rounded-2xl p-3 border border-slate-200/80 dark:border-slate-800 shadow-xs relative">
    <!-- Profil-Button -->
    <div class="relative">
      <button
        type="button"
        onclick={() => (showUserDropdown = !showUserDropdown)}
        class="flex items-center gap-2.5 text-left bg-transparent border-none p-0 cursor-pointer"
        aria-haspopup="true"
        aria-expanded={showUserDropdown}
      >
        <div class="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700/60 flex items-center justify-center text-xl shadow-2xs">
          {activeProfile.avatar}
        </div>
        <div>
          <div class="flex items-center gap-1.5">
            <span class="font-extrabold text-slate-900 dark:text-slate-100 text-sm">
              {activeProfile.name}
            </span>
            <span class="text-[10px] text-slate-400 font-black">▾</span>
          </div>
          <span class="text-[11px] font-medium text-slate-400 dark:text-slate-400">
            ZahlenBlitz v3.0
          </span>
        </div>
      </button>

      {#if showUserDropdown}
        <div class="absolute left-0 top-full mt-2 w-60 bg-white dark:bg-[#111827] border-2 border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-50 p-1.5 space-y-1 animate-slide-up">
          <div class="px-2.5 py-1 text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
            Spieler wechseln
          </div>

          {#each profiles as prof (prof.id)}
            {@const isCurrent = prof.id === activeProfile.id}
            <button
              type="button"
              onclick={() => {
                showUserDropdown = false;
                onSelectProfile(prof.id);
              }}
              class="w-full flex items-center gap-2.5 p-2 rounded-xl text-left border-none cursor-pointer transition {
                isCurrent
                  ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-950 dark:text-white font-bold'
                  : 'bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800/70 text-slate-700 dark:text-slate-200'
              }"
            >
              <span class="text-xl shrink-0">{prof.avatar}</span>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-1">
                  <span class="font-black text-xs truncate">{prof.name}</span>
                  {#if isCurrent}
                    <span class="text-indigo-600 text-xs font-black">✓</span>
                  {/if}
                </div>
              </div>
            </button>
          {/each}

          <div class="border-t border-slate-100 dark:border-slate-800 my-1"></div>

          <button
            type="button"
            onclick={() => {
              showUserDropdown = false;
              showParentalGate = true;
            }}
            class="w-full flex items-center gap-2 p-2 rounded-xl text-left text-xs font-black text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 border-none cursor-pointer"
          >
            <span>⚙️</span>
            <span>Optionen &amp; Spieler verwalten 🔒</span>
          </button>
        </div>
      {/if}
    </div>

    <!-- Stats & Quick Actions -->
    <div class="flex items-center gap-1.5 text-xs font-bold">
      <!-- Sterne -->
      <div
        class="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2.5 py-1.5 rounded-xl border border-amber-200/60 dark:border-amber-800/40 shadow-2xs"
        title="{stats.stars} gesammelte Sterne"
      >
        <span class="text-amber-500 text-xs">⭐</span>
        <span class="font-extrabold">{stats.stars}</span>
      </div>

      <!-- Sound Toggle -->
      <button
        type="button"
        onclick={onToggleSound}
        class="p-1.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 text-xs border border-transparent cursor-pointer"
        title={soundEnabled ? 'Ton stumm' : 'Ton an'}
      >
        {soundEnabled ? '🔊' : '🔇'}
      </button>

      <!-- Einstellungen (mit Eltern-Gate geschützt) -->
      <button
        type="button"
        onclick={() => (showParentalGate = true)}
        class="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 text-xs cursor-pointer flex items-center gap-0.5"
        title="Elternbereich &amp; Optionen (gesichert)"
        aria-label="Optionen öffnen"
      >
        <span>⚙️</span>
        <span class="text-[9px]">🔒</span>
      </button>
    </div>
  </header>

  <!-- 2. AKTIVER LERNBEREICH (KOMPAKT & KINDGERECHT) -->
  <div class="flex items-center justify-between bg-white dark:bg-[#111827] px-3.5 py-2.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
    <div class="flex items-center gap-2.5">
      <div class="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-base shrink-0">
        {gameMode === 'mult' ? '✖️' : '➕'}
      </div>
      <div>
        <span class="font-black text-xs text-slate-900 dark:text-white block leading-tight">
          {gameMode === 'mult' ? '1×1 Meister (× / :)' : 'Zahlen-Held (+ / −)'}
        </span>
        <span class="text-[10px] text-slate-400 font-medium">
          {gameMode === 'mult' ? 'Kleines Einmaleins (Klasse 2–4)' : 'Zahlenraum bis 20 (Klasse 1 & 2)'}
        </span>
      </div>
    </div>

    <button
      type="button"
      onclick={() => (showParentalGate = true)}
      class="text-[10px] font-black text-indigo-600 dark:text-indigo-400 hover:underline bg-transparent border-none p-0 cursor-pointer flex items-center gap-1"
      title="Lernbereich im Elternbereich umstellen"
    >
      <span>Ändern</span>
      <span class="text-[9px]">🔒</span>
    </button>
  </div>

  <!-- 3. HERO: TAGES-MISSION -->
  <section class="bg-gradient-to-br from-indigo-950 via-[#0f172a] to-[#0f172a] rounded-3xl p-4 text-white border border-indigo-500/20 shadow-sm relative overflow-hidden" aria-label="Tages-Mission">
    <div class="flex items-center justify-between text-xs mb-1.5">
      <span class="text-[10px] uppercase tracking-wider font-extrabold text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-full border border-indigo-400/20">
        Tages-Mission
      </span>
      <span class="text-[11px] text-slate-300 font-medium flex items-center gap-1">
        {#if dueCount > 0}
          <span class="text-amber-400">●</span> {dueCount} Wiederholungen fällig
        {:else}
          <span class="text-emerald-400">✓</span> Alles aufgefrischt!
        {/if}
      </span>
    </div>

    <h2 class="text-base font-extrabold text-white mt-1">
      {dueCount >= stats.sessionSize
        ? `${stats.sessionSize} Fakten: Auffrischen & Neues`
        : `${stats.sessionSize} gemischte Trainings-Fakten`}
    </h2>
    <p class="text-xs text-slate-300 mt-0.5">
      {gameMode === 'mult'
        ? 'Festigt das 1×1 im Langzeitgedächtnis und schaltet Umkehraufgaben frei.'
        : 'Festigt Zerlegungen und Zehnerstopp im Langzeitgedächtnis.'}
    </p>

    <button
      type="button"
      onclick={onStartDailySession}
      class="mt-3.5 w-full bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition btn-calm-primary cursor-pointer border-none shadow-sm"
    >
      <span>▶</span>
      <span>Tages-Mission starten</span>
    </button>
  </section>

  <!-- 3b. ZWEI TRAININGS-MODI: WACKELKANDIDATEN & 60s BLITZ-CHALLENGE -->
  <div class="grid grid-cols-2 gap-2.5">
    <!-- Wackelkandidaten-Trainer -->
    <button
      type="button"
      onclick={onStartWeakSpots}
      disabled={weakSpotCount === 0}
      class="card-press text-left p-3 rounded-2xl border transition flex flex-col justify-between {
        weakSpotCount > 0
          ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800/60 cursor-pointer shadow-2xs'
          : 'bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 opacity-70 cursor-default'
      }"
    >
      <div>
        <div class="flex items-center justify-between">
          <span class="text-base">🧠</span>
          <span class="text-[9.5px] font-black px-1.5 py-0.5 rounded-full {
            weakSpotCount > 0
              ? 'bg-amber-200 dark:bg-amber-900/60 text-amber-900 dark:text-amber-200'
              : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
          }">
            {weakSpotCount > 0 ? `${weakSpotCount} Knacknüsse` : 'Alles fest!'}
          </span>
        </div>
        <div class="font-extrabold text-xs text-slate-900 dark:text-slate-100 mt-1.5 leading-tight">
          Wackelkandidaten
        </div>
        <div class="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
          {weakSpotCount > 0 ? 'Schwierige Aufgaben gezielt festigen' : 'Keine Wackelkandidaten!'}
        </div>
      </div>
      <div class="text-[10px] font-bold text-amber-600 dark:text-amber-400 mt-2 flex items-center gap-1">
        {#if weakSpotCount > 0}
          <span>Starten</span> <span>›</span>
        {:else}
          <span class="text-emerald-600 dark:text-emerald-400">Alles sicher ✓</span>
        {/if}
      </div>
    </button>

    <!-- 60s Blitz-Challenge -->
    <button
      type="button"
      onclick={onStartBlitz}
      class="card-press text-left p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-300 dark:border-indigo-800/60 transition cursor-pointer flex flex-col justify-between shadow-2xs"
    >
      <div>
        <div class="flex items-center justify-between">
          <span class="text-base">⚡</span>
          <span class="text-[9.5px] font-black px-1.5 py-0.5 rounded-full bg-indigo-200 dark:bg-indigo-900/60 text-indigo-900 dark:text-indigo-200">
            60s Sprint
          </span>
        </div>
        <div class="font-extrabold text-xs text-slate-900 dark:text-slate-100 mt-1.5 leading-tight">
          Blitz-Challenge
        </div>
        <div class="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
          Wie viele schaffst du in 1 Minute?
        </div>
      </div>
      <div class="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mt-2 flex items-center justify-between">
        <span>Rekord: {stats.blitzHighscore ?? 0}</span>
        <span>Starten ›</span>
      </div>
    </button>
  </div>

  <!-- 4. RECHENWELTEN: 3 STRATEGIE-KAPITEL -->
  <section class="bg-white dark:bg-[#111827] rounded-2xl p-3.5 border border-slate-200/80 dark:border-slate-800 shadow-xs" aria-label="Rechenwelten">
    <div class="flex items-center justify-between mb-2">
      <div>
        <h3 class="text-xs font-extrabold text-slate-900 dark:text-white flex items-center gap-1.5 m-0">
          <span>🗺️</span> <span>Rechenwelten</span>
        </h3>
        <span class="text-[10px] text-slate-400">
          Tippe auf eine Welt für Details &amp; Üben
        </span>
      </div>
      <span class="text-[11px] font-bold text-slate-500 dark:text-slate-400">
        ⭐ {chapters.reduce((acc, c) => acc + c.stars, 0)} / 9
      </span>
    </div>

    <div class="grid grid-cols-3 gap-2">
      {#each chapters as ch (ch.id)}
        <button
          type="button"
          class="card-press text-left p-2.5 rounded-xl border transition cursor-pointer flex flex-col justify-between {
            ch.stars < 3 && ch.stars > 0
              ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800/60'
              : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700/60'
          }"
          onclick={() => (selectedChapterId = ch.id)}
        >
          <div>
            <div class="flex items-center justify-between text-xs">
              <span class="text-base">{ch.icon}</span>
              <span
                class="text-[9px] font-black px-1 rounded {
                  ch.percent >= 80
                    ? 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/50'
                    : 'text-indigo-700 bg-indigo-50 dark:bg-indigo-950/50'
                }"
              >
                {ch.percent}%
              </span>
            </div>

            <div class="font-extrabold text-[11px] text-slate-900 dark:text-slate-100 mt-1.5 leading-snug break-words">
              {ch.title}
            </div>
            <div class="text-[9.5px] text-slate-500 dark:text-slate-400 mt-0.5 break-words">
              {ch.subtitle}
            </div>
          </div>

          <div class="text-[10px] text-amber-500 mt-2 flex items-center justify-between">
            <span>
              {#if ch.stars === 3}
                ⭐⭐⭐
              {:else if ch.stars === 2}
                ⭐⭐<span class="text-slate-300">⚪</span>
              {:else if ch.stars === 1}
                ⭐<span class="text-slate-300">⚪⚪</span>
              {:else}
                <span class="text-slate-300">⚪⚪⚪</span>
              {/if}
            </span>
            <span class="text-[9px] text-indigo-500 font-bold">Info ›</span>
          </div>
        </button>
      {/each}
    </div>
  </section>

  <!-- 5. WISSENSKARTE: MOTIVIERENDE FORTSCHRITTS-KARTE STATT RIESEN-MATRIX -->
  <section class="bg-white dark:bg-[#111827] rounded-3xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3" aria-label="Wissenskarte Fortschritt">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="text-2xl">🗺️</span>
        <div>
          <h3 class="text-xs font-black text-slate-900 dark:text-white m-0">
            {gameMode === 'mult' ? '1×1 Wissenskarte' : 'Zahlen-Held Wissenskarte'}
          </h3>
          <span class="text-[10px] text-slate-400 font-medium">
            Dein Weg zur Meisterschaft aller 100 Aufgaben
          </span>
        </div>
      </div>

      <button
        type="button"
        onclick={onOpenMatrix}
        class="text-[11px] font-black text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200/60 dark:border-indigo-800/40 px-2.5 py-1 rounded-xl cursor-pointer transition shadow-2xs"
      >
        Öffnen ›
      </button>
    </div>

    <!-- Fortschrittsbalken -->
    <div class="space-y-1">
      <div class="flex items-center justify-between text-xs">
        <span class="font-extrabold text-slate-800 dark:text-slate-200">
          {masteryStats.greenSteps} von 100 Fakten gemeistert
        </span>
        <span class="font-black text-indigo-600 dark:text-indigo-400">
          {masteryStats.percent}%
        </span>
      </div>
      <div class="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200/60 dark:border-slate-700/60">
        <div
          class="bg-gradient-to-r from-emerald-500 via-emerald-400 to-indigo-500 h-full rounded-full transition-all duration-300 shadow-xs"
          style="width: {masteryStats.percent}%"
        ></div>
      </div>
    </div>

    <!-- Status-Pills -->
    <div class="grid grid-cols-3 gap-1.5 text-center text-[10px] font-bold">
      <div class="bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40 p-1.5 rounded-xl text-amber-800 dark:text-amber-300">
        <span class="text-xs block">👑 {masteryStats.crowns}</span>
        <span class="text-[9px] uppercase tracking-wide">Kronen</span>
      </div>

      <div class="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-800/40 p-1.5 rounded-xl text-emerald-800 dark:text-emerald-300">
        <span class="text-xs block">🟢 {masteryStats.greenSteps}</span>
        <span class="text-[9px] uppercase tracking-wide">Gemeistert</span>
      </div>

      <div class="bg-rose-50 dark:bg-rose-950/30 border border-rose-200/60 dark:border-rose-800/40 p-1.5 rounded-xl text-rose-800 dark:text-rose-300">
        <span class="text-xs block">🚨 {masteryStats.wrong}</span>
        <span class="text-[9px] uppercase tracking-wide">Knacknüsse</span>
      </div>
    </div>

    <!-- Aktions-Button zur Rechentafel -->
    <button
      type="button"
      onclick={onOpenMatrix}
      class="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-800 dark:text-slate-200 font-extrabold py-2.5 px-3 rounded-2xl text-xs flex items-center justify-center gap-2 border border-slate-200/80 dark:border-slate-700 cursor-pointer transition shadow-2xs"
    >
      <span>🗺️</span>
      <span>Ganze 100er-Tafel anzeigen &amp; Fakten prüfen</span>
      <span>›</span>
    </button>
  </section>

  <!-- 6. FOOTER: OPTIONEN, IMPRESSUM & DATENSCHUTZ, RELOAD -->
  <footer class="pt-3 pb-4 flex items-center justify-between text-slate-400 dark:text-slate-500 text-[11px] border-t border-slate-100 dark:border-slate-800/80">
    <button
      type="button"
      onclick={() => (showParentalGate = true)}
      class="hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1 bg-transparent border-none p-0 cursor-pointer text-xs font-semibold"
    >
      <span>⚙️</span> <span>Optionen 🔒</span>
    </button>

    <button
      type="button"
      onclick={onOpenLegal}
      class="hover:text-slate-700 dark:hover:text-slate-300 bg-transparent border-none p-0 cursor-pointer text-[11px] font-semibold hover:underline"
    >
      Impressum &amp; Datenschutz
    </button>

    <div class="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
      <span>ZahlenBlitz 3.0</span>
      <button
        type="button"
        onclick={() => window.location.reload()}
        class="hover:text-slate-700 dark:hover:text-slate-300 bg-transparent border-none p-0 cursor-pointer text-[11px] leading-none transition"
        title="App neu laden (nach Updates)"
        aria-label="App neu laden"
      >
        🔄
      </button>
    </div>
  </footer>
</div>

<!-- KAPITEL-DRAWER -->
{#if selectedChapter}
  <div
    class="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-end sm:items-center justify-center p-3"
    onclick={(e) => {
      if (e.target === e.currentTarget) selectedChapterId = null;
    }}
    onkeydown={(e) => {
      if (e.key === 'Escape') selectedChapterId = null;
    }}
    tabindex="-1"
    role="dialog"
    aria-modal="true"
  >
    <div class="w-full max-w-md bg-white dark:bg-[#111827] border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4 animate-slide-up">
      <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <div class="flex items-center gap-2.5">
          <span class="text-3xl">{selectedChapter.icon}</span>
          <div>
            <h4 class="text-sm font-extrabold text-slate-900 dark:text-white m-0">
              {selectedChapter.title}
            </h4>
            <p class="text-[11px] text-slate-400 m-0">
              {selectedChapter.subtitle} · {selectedChapter.statusText}
            </p>
          </div>
        </div>
        <button
          type="button"
          onclick={() => (selectedChapterId = null)}
          class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 text-xs font-bold border-none cursor-pointer flex items-center justify-center"
        >
          ✕
        </button>
      </div>

      <!-- Sterne Fortschritte -->
      <div class="space-y-2">
        <div class="p-2.5 rounded-xl border {selectedChapter.star1Progress.isAchieved ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-300' : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200'}">
          <div class="flex items-center justify-between text-xs font-extrabold">
            <span>⭐ Stern 1: Grundaufgaben</span>
            <span class="text-[10px]">{selectedChapter.star1Progress.current}/{selectedChapter.star1Progress.total} ({selectedChapter.star1Progress.percent}%)</span>
          </div>
          <p class="text-[11px] text-slate-500 m-0 mt-0.5">{selectedChapter.star1Desc}</p>
        </div>

        <div class="p-2.5 rounded-xl border {selectedChapter.star2Progress.isAchieved ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-300' : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200'}">
          <div class="flex items-center justify-between text-xs font-extrabold">
            <span>⭐⭐ Stern 2: Umkehraufgaben</span>
            <span class="text-[10px]">{selectedChapter.star2Progress.current}/{selectedChapter.star2Progress.total} ({selectedChapter.star2Progress.percent}%)</span>
          </div>
          <p class="text-[11px] text-slate-500 m-0 mt-0.5">{selectedChapter.star2Desc}</p>
        </div>

        <div class="p-2.5 rounded-xl border {selectedChapter.star3Progress.isAchieved ? 'bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-300' : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200'}">
          <div class="flex items-center justify-between text-xs font-extrabold">
            <span>⭐⭐⭐ Stern 3: Lücken &amp; Meisterschaft</span>
            <span class="text-[10px]">{selectedChapter.star3Progress.current}/{selectedChapter.star3Progress.total} ({selectedChapter.star3Progress.percent}%)</span>
          </div>
          <p class="text-[11px] text-slate-500 m-0 mt-0.5">{selectedChapter.star3Desc}</p>
        </div>
      </div>

      <button
        type="button"
        onclick={() => {
          const ch = selectedChapter;
          selectedChapterId = null;
          if (ch) onStartChapterSession(ch);
        }}
        class="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold py-3 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition btn-calm-primary cursor-pointer border-none"
      >
        <span>🚀</span>
        <span>Diese Rechenwelt jetzt üben</span>
      </button>
    </div>
  </div>
{/if}

<!-- KINDERSICHERUNG (PARENTAL GATE MODAL) -->
{#if showParentalGate}
  <ParentalGateModal
    onSuccess={() => {
      showParentalGate = false;
      onOpenUsers();
    }}
    onCancel={() => (showParentalGate = false)}
  />
{/if}
