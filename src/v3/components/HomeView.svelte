<script lang="ts">
  import type { WorldChapterV3 } from '../lib/chapters';
  import { countDueFactsV3, getWeakSpotFactsV3 } from '../lib/storage';
  import type { FactFamily, GameMode, UserProfileV3, UserStatsV3 } from '../lib/types';
  import ParentalGateModal from './ParentalGateModal.svelte';
  import Heatmap from './Heatmap.svelte';
  import StickerModal from './StickerModal.svelte';

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
    onOpenUsers: () => void;
    onOpenLegal: () => void;
    onSaveStickers?: (
      unlockedStickers: string[],
      newStars: number,
      newBadge?: string,
      newAvatar?: string
    ) => void;
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
    onOpenUsers,
    onOpenLegal,
    onSaveStickers,
  }: Props = $props();

  let dueCount = $derived(countDueFactsV3(facts));
  let weakSpotCount = $derived(getWeakSpotFactsV3(facts).length);

  let showUserDropdown = $state(false);
  let showParentalGate = $state(false);
  let showStickerModal = $state(false);
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
          <span class="text-[11px] font-bold text-indigo-600 dark:text-indigo-400">
            {gameMode === 'mult' ? '1x1 Meister' : 'Zahlen-Held'}
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
      <!-- Sterne (Klick öffnet Sticker-Album & Belohnungen) -->
      <button
        type="button"
        onclick={() => (showStickerModal = true)}
        class="card-press flex items-center gap-1.5 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 hover:bg-amber-100/70 dark:hover:bg-amber-900/40 px-2.5 py-1.5 rounded-xl border border-amber-200/60 dark:border-amber-800/40 shadow-2xs cursor-pointer transition"
        title="{stats.stars} gesammelte Sterne · Tippe für dein Sticker-Album ✨"
        aria-label="Sticker-Album öffnen, {stats.stars} Sterne gesammelt"
      >
        <span class="text-amber-500 text-xs">⭐</span>
        <span class="font-extrabold">{stats.stars}</span>
        <span class="text-[9.5px] text-amber-500 font-black">✨</span>
      </button>

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

  <!-- 4. 10x10 RECHENTAFEL DIREKT AUF DEM HAUPTBILDSCHIRM -->
  <Heatmap
    {gameMode}
    {facts}
    onPracticeFact={onPracticeFact}
  />

  <!-- 5. WEITERE TRAININGS-MODI: WACKELKANDIDATEN & 60s BLITZ-CHALLENGE -->
  <section class="space-y-1.5" aria-label="Weitere Trainingsmodi">
    <div class="flex items-center justify-between px-1">
      <span class="text-[11px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        Zusatz-Training &amp; Herausforderung
      </span>
    </div>

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

<!-- STICKER-ALBUM & BELOHNUNGEN MODAL -->
{#if showStickerModal}
  <StickerModal
    initialStars={stats.stars}
    initialUnlockedStickers={activeProfile.unlockedStickers ?? []}
    initialBadge={activeProfile.activeBadge}
    initialAvatar={activeProfile.avatar}
    {soundEnabled}
    onSave={(unlocked, newStars, newBadge, newAvatar) => {
      onSaveStickers?.(unlocked, newStars, newBadge, newAvatar);
    }}
    onClose={() => (showStickerModal = false)}
  />
{/if}
