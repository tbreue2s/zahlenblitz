<script lang="ts">
  import { playKeyTap, playSuccessSound } from '../lib/audio';
  import type { WorldChapterV3 } from '../lib/chapters';
  import { ALL_STICKERS } from '../lib/stickers';
  import {
    countDueFactsV3,
    getProfileDefaultAvatar,
    getWeakSpotFactsV3,
  } from '../lib/storage';
  import type {
    FactFamily,
    GameMode,
    PracticeOperation,
    PracticeWorldScope,
    UserProfileV3,
    UserStatsV3,
  } from '../lib/types';
  import ParentalGateModal from './ParentalGateModal.svelte';
  import Heatmap from './Heatmap.svelte';
  import StickerModal from './StickerModal.svelte';

  interface Props {
    gameMode: GameMode;
    facts: FactFamily[];
    scopedFacts?: FactFamily[];
    stats: UserStatsV3;
    activeProfile: UserProfileV3;
    profiles: UserProfileV3[];
    soundEnabled: boolean;
    highlightStars?: boolean;
    practiceOperation?: PracticeOperation;
    effectiveWorldScope?: PracticeWorldScope;
    unlockedWorldCount?: number;
    onAcknowledgeStars?: () => void;
    onSwitchGameMode: (mode: GameMode) => void;
    onSelectOperation?: (op: PracticeOperation) => void;
    onSelectWorldScope?: (scope: PracticeWorldScope) => void;
    onAcknowledgeWorldUnlock?: (worldNum: number) => void;
    onSelectProfile: (id: string) => void;
    onToggleSound: () => void;
    onStartDailySession: () => void;
    onStartWeakSpots: () => void;
    onStartBlitz: () => void;
    onStartChapterSession: (chapter: WorldChapterV3) => void;
    onStartRowSession?: (rowNumber: number) => void;
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
    scopedFacts,
    stats,
    activeProfile,
    profiles,
    soundEnabled,
    highlightStars = false,
    practiceOperation = 'base',
    effectiveWorldScope = 1,
    unlockedWorldCount = 1,
    onAcknowledgeStars,
    onSwitchGameMode,
    onSelectOperation,
    onSelectWorldScope,
    onAcknowledgeWorldUnlock,
    onSelectProfile,
    onToggleSound,
    onStartDailySession,
    onStartWeakSpots,
    onStartBlitz,
    onStartChapterSession,
    onStartRowSession,
    onPracticeFact,
    onOpenUsers,
    onOpenLegal,
    onSaveStickers,
  }: Props = $props();

  let activeFactsScope = $derived(scopedFacts ?? facts);
  let dueCount = $derived(countDueFactsV3(activeFactsScope));
  let weakSpotCount = $derived(getWeakSpotFactsV3(activeFactsScope).length);
  let canAffordNewSticker = $derived.by(() => {
    const unlocked = new Set(activeProfile.unlockedStickers ?? []);
    return ALL_STICKERS.some((s) => !unlocked.has(s.id) && stats.stars >= s.cost);
  });
  let shouldPulseStars = $derived(highlightStars && canAffordNewSticker);

  let showUserDropdown = $state(false);
  let showParentalGate = $state(false);
  let showStickerModal = $state(false);
  let showNoWeakSpotsModal = $state(false);
  let lockedWorldNotice = $state<number | null>(null);

  let showUnlockBanner = $derived(
    !(activeProfile.freeWorldChoice ?? false) &&
      unlockedWorldCount > 1 &&
      (stats.acknowledgedUnlockedWorld ?? 1) < unlockedWorldCount &&
      effectiveWorldScope !== unlockedWorldCount &&
      effectiveWorldScope !== 'all'
  );

  let operationOptions = $derived<
    { id: PracticeOperation; icon: string; label: string; fullLabel: string }[]
  >(
    gameMode === 'mult'
      ? [
          { id: 'base', icon: '✖️', label: 'Mal', fullLabel: 'Nur Mal' },
          { id: 'inverse', icon: '➗', label: 'Geteilt', fullLabel: 'Nur Geteilt' },
          { id: 'mix', icon: '✖️➗', label: 'Mix', fullLabel: 'Mal & Geteilt Mix' },
          { id: 'gap', icon: '🧩', label: 'Lücken', fullLabel: 'Lücken-Profi' },
        ]
      : [
          { id: 'base', icon: '➕', label: 'Plus', fullLabel: 'Nur Plus' },
          { id: 'inverse', icon: '➖', label: 'Minus', fullLabel: 'Nur Minus' },
          { id: 'mix', icon: '➕➖', label: 'Mix', fullLabel: 'Plus & Minus Mix' },
          { id: 'gap', icon: '🧩', label: 'Lücken', fullLabel: 'Lücken-Profi' },
        ]
  );

  let activeWorldSummary = $derived.by(() => {
    if (effectiveWorldScope === 'all') {
      return unlockedWorldCount < 3 ? 'Alle freigeschalteten Welten' : 'Alle Welten';
    }
    if (effectiveWorldScope === 1) {
      return gameMode === 'mult' ? 'Welt 1 (Kernreihen)' : 'Welt 1 (Basis bis 10)';
    }
    if (effectiveWorldScope === 2) {
      return gameMode === 'mult'
        ? 'Welt 2 (Forscherreihen)'
        : 'Welt 2 (Verdoppeln & Zehner)';
    }
    return gameMode === 'mult' ? 'Welt 3 (Königsaufgaben)' : 'Welt 3 (Zehnerübergang)';
  });

  let worldInfo = $derived.by(() => {
    if (effectiveWorldScope === 1) {
      return {
        icon: '🥉',
        title: gameMode === 'mult' ? 'Welt 1 (Kernreihen)' : 'Welt 1 (Basis bis 10)',
        desc:
          gameMode === 'mult'
            ? 'Reihen 1, 2, 5 und 10 bilden das solide Kreuz-Skelett der 100er-Tafel.'
            : 'Alle 45 Zerlegungen bis 10 bilden das unverzichtbare Fundament.',
      };
    }
    if (effectiveWorldScope === 2) {
      return {
        icon: '🥈',
        title:
          gameMode === 'mult'
            ? 'Welt 2 (Forscherreihen)'
            : 'Welt 2 (Doppelgänger & Nachbarn)',
        desc:
          gameMode === 'mult'
            ? 'Reihen 3 & 4 nutzen geschicktes Verdoppeln und Nachbar-Beziehungen zur Basis.'
            : 'Verdoppeln und Nachbaraufgaben bis 20 festigen Zwischenschritte.',
      };
    }
    if (effectiveWorldScope === 3) {
      return {
        icon: '🥇',
        title:
          gameMode === 'mult'
            ? 'Welt 3 (Königsaufgaben)'
            : 'Welt 3 (Zehnerübergang)',
        desc:
          gameMode === 'mult'
            ? 'Die 16 anspruchsvollsten Königsaufgaben der Reihen 6, 7, 8 und 9 (z. B. 7 × 8 = 56).'
            : 'Der Zehnerübergang (Zehnerstopp über die 10, z. B. 8 + 5 = 13).',
      };
    }
    return {
      icon: '🌟',
      title: 'Alle Welten',
      desc:
        gameMode === 'mult'
          ? 'Gemischtes Training über alle deine bisher freigeschalteten Reihen.'
          : 'Gemischtes Training über das gesamte Zahlen-Held-Spektrum.',
    };
  });

  let activeOperationSummary = $derived(
    operationOptions.find((o) => o.id === practiceOperation)?.fullLabel ??
      operationOptions[0].fullLabel
  );

  function handleWeakSpotsClick() {
    if (weakSpotCount > 0) {
      onStartWeakSpots();
    } else {
      playSuccessSound(soundEnabled, false);
      showNoWeakSpotsModal = true;
    }
  }
</script>

<div class="w-full max-w-lg mx-auto space-y-3.5 pb-8 text-[#0f1115] dark:text-white">
  <!-- 1. KOPFZEILE MIT PROFIL, STERNEN & EINSTELLUNGEN -->
  <header class="flex items-center justify-between px-1 pt-1 relative">
    <!-- Profil-Button -->
    <div class="relative">
      <button
        type="button"
        onclick={() => (showUserDropdown = !showUserDropdown)}
        class="flex items-center gap-3 text-left bg-transparent border-none p-0 cursor-pointer"
        aria-haspopup="true"
        aria-expanded={showUserDropdown}
      >
        <div class="w-12 h-12 rounded-full bg-[#e8f0ff] dark:bg-[#4c9aff]/15 flex items-center justify-center text-2xl">
          {activeProfile.avatar}
        </div>
        <div>
          <div class="flex items-center gap-1.5">
            <span class="font-extrabold text-xl tracking-tight leading-tight text-[#0f1115] dark:text-white">
              {activeProfile.name}
            </span>
            <span class="text-[10px] text-[#6b7280] dark:text-[#98989f] font-black">▾</span>
          </div>
          <span class="text-xs font-bold text-[#0a6cff] dark:text-[#4c9aff]">
            {gameMode === 'mult' ? '1x1 Meister' : 'Zahlen-Held'}
          </span>
        </div>
      </button>

      {#if showUserDropdown}
        <div class="absolute left-0 top-full mt-2 w-60 bg-white dark:bg-[#1c1c1e] border border-black/[0.07] dark:border-white/[0.09] rounded-3xl shadow-xl z-50 p-1.5 space-y-1 animate-slide-up">
          <div class="px-2.5 py-1 text-[11px] font-extrabold text-[#6b7280] dark:text-[#98989f] uppercase tracking-wider">
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
              class="w-full flex items-center gap-2.5 p-2 rounded-2xl text-left border-none cursor-pointer transition {
                isCurrent
                  ? 'bg-[#e8f0ff] dark:bg-[#4c9aff]/15 text-[#0f1115] dark:text-white font-bold'
                  : 'bg-transparent hover:bg-black/[0.04] dark:hover:bg-white/[0.06] text-[#0f1115] dark:text-slate-200'
              }"
            >
              <span class="text-xl shrink-0">{prof.avatar}</span>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between gap-1">
                  <span class="font-black text-xs truncate">{prof.name}</span>
                  {#if isCurrent}
                    <span class="text-[#0a6cff] dark:text-[#4c9aff] text-xs font-black">✓</span>
                  {/if}
                </div>
              </div>
            </button>
          {/each}

          <div class="border-t border-black/[0.07] dark:border-white/[0.09] my-1"></div>

          <button
            type="button"
            onclick={() => {
              showUserDropdown = false;
              showParentalGate = true;
            }}
            class="w-full flex items-center gap-2 p-2 rounded-2xl text-left text-xs font-black text-[#0a6cff] dark:text-[#4c9aff] hover:bg-[#e8f0ff] dark:hover:bg-[#4c9aff]/15 border-none cursor-pointer"
          >
            <span>⚙️</span>
            <span>Optionen &amp; Spieler verwalten 🔒</span>
          </button>
        </div>
      {/if}
    </div>

    <!-- Stats & Quick Actions -->
    <div class="flex items-center gap-2 text-sm font-bold">
      <!-- Sterne (Klick öffnet Sticker-Album & Belohnungen) -->
      <button
        type="button"
        onclick={() => {
          showStickerModal = true;
          onAcknowledgeStars?.();
        }}
        class="relative h-10 px-3.5 rounded-full flex items-center gap-1.5 font-extrabold text-[#0f1115] dark:text-white bg-white dark:bg-[#1c1c1e] ring-1 ring-inset cursor-pointer transition active:scale-95 {
          shouldPulseStars
            ? 'ring-amber-500/80 dark:ring-amber-400/80 animate-star-pulse'
            : 'ring-black/[0.08] dark:ring-white/[0.09]'
        }"
        title="{stats.stars} gesammelte Sterne · Tippe für dein Sticker-Album"
        aria-label="Sticker-Album öffnen, {stats.stars} Sterne gesammelt"
      >
        <svg class="w-[18px] h-[18px] text-amber-500 transition-transform {shouldPulseStars ? 'scale-110' : ''}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.5l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 18.2 5.8 21.5 7 14.7l-5-4.9 6.9-1z"/></svg>
        <span>{stats.stars}</span>
        {#if shouldPulseStars}
          <span
            class="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-[#f2f3f5] dark:ring-black"
            aria-hidden="true"
          ></span>
        {/if}
      </button>

      <!-- Sound Toggle -->
      <button
        type="button"
        onclick={onToggleSound}
        class="w-10 h-10 rounded-full flex items-center justify-center text-[#0f1115] dark:text-white bg-white dark:bg-[#1c1c1e] ring-1 ring-inset ring-black/[0.08] dark:ring-white/[0.09] cursor-pointer transition active:scale-95"
        title={soundEnabled ? 'Ton stumm' : 'Ton an'}
        aria-label={soundEnabled ? 'Ton stumm schalten' : 'Ton einschalten'}
      >
        {#if soundEnabled}
          <svg class="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 010 7"/><path d="M18.5 5.5a9 9 0 010 13"/></svg>
        {:else}
          <svg class="w-[18px] h-[18px] opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M22 9l-6 6M16 9l6 6"/></svg>
        {/if}
      </button>

      <!-- Einstellungen (mit Eltern-Gate geschützt) -->
      <button
        type="button"
        onclick={() => (showParentalGate = true)}
        class="relative w-10 h-10 rounded-full flex items-center justify-center text-[#0f1115] dark:text-white bg-white dark:bg-[#1c1c1e] ring-1 ring-inset ring-black/[0.08] dark:ring-white/[0.09] cursor-pointer transition active:scale-95"
        title="Elternbereich &amp; Optionen (gesichert)"
        aria-label="Optionen öffnen"
      >
        <svg class="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
        <svg class="absolute right-1.5 bottom-1.5 w-2.5 h-2.5 bg-white dark:bg-[#1c1c1e] rounded-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/></svg>
      </button>
    </div>
  </header>


  <!-- 2. OPT-IN FEIER-BANNER BEI NEUER FREIGESCHALTETER WELT -->
  {#if showUnlockBanner}
    <section
      class="bg-emerald-50 dark:bg-emerald-950/50 rounded-[22px] p-4 border border-emerald-300/80 dark:border-emerald-700/70 space-y-2.5 animate-fade-in"
      aria-label="Neue Welt freigeschaltet"
    >
      <div class="flex items-start gap-2.5">
        <span class="text-2xl shrink-0">🎉</span>
        <div>
          <h3 class="text-sm font-black text-emerald-950 dark:text-emerald-100 m-0">
            Geschafft! Welt {unlockedWorldCount} ist freigeschaltet!
          </h3>
          <p class="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5 mb-0 leading-snug">
            Du hast Welt {unlockedWorldCount - 1} super gemeistert! Möchtest du jetzt wechseln oder noch in deiner bisherigen Welt bleiben?
          </p>
        </div>
      </div>
      <div class="flex flex-wrap gap-2">
        <button
          type="button"
          onclick={() => {
            playKeyTap(soundEnabled);
            lockedWorldNotice = null;
            onSelectWorldScope?.(unlockedWorldCount as 2 | 3);
            onAcknowledgeWorldUnlock?.(unlockedWorldCount);
          }}
          class="flex-1 min-w-[140px] py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black border-none cursor-pointer shadow-xs transition active:scale-[0.98]"
        >
          🚀 Zu Welt {unlockedWorldCount} wechseln
        </button>
        <button
          type="button"
          onclick={() => {
            playKeyTap(soundEnabled);
            onAcknowledgeWorldUnlock?.(unlockedWorldCount);
          }}
          class="py-2 px-3 rounded-xl bg-white/80 dark:bg-slate-800 hover:bg-white dark:hover:bg-slate-700 text-emerald-900 dark:text-emerald-200 text-xs font-extrabold border border-emerald-300/70 dark:border-emerald-700 cursor-pointer transition"
        >
          Hier bleiben
        </button>
      </div>
    </section>
  {/if}

  <!-- 3. HERO: TAGES-MISSION -->
  <section class="bg-white dark:bg-[#1c1c1e] rounded-[22px] p-5 border border-black/[0.07] dark:border-white/[0.07]" aria-label="Tages-Mission">
    <div class="flex items-center justify-between gap-2">
      <span class="text-xs font-bold text-[#0a6cff] dark:text-[#4c9aff] bg-[#e8f0ff] dark:bg-[#4c9aff]/15 px-3 py-1 rounded-full">
        Tages-Mission
      </span>
      <span class="text-xs text-[#6b7280] dark:text-[#98989f] font-semibold flex items-center gap-1.5">
        {#if dueCount > 0}
          <span class="w-2 h-2 rounded-full bg-amber-500 inline-block"></span> {dueCount} fällig
        {:else}
          <span class="text-emerald-500 font-black">✓</span> Alles aufgefrischt!
        {/if}
      </span>
    </div>

    <h2 class="text-lg sm:text-xl font-extrabold tracking-tight leading-tight whitespace-nowrap text-[#0f1115] dark:text-white mt-3.5 mb-0">
      {stats.sessionSize} Aufgaben für heute
    </h2>
    <p class="text-[13px] text-[#6b7280] dark:text-[#98989f] font-semibold mt-1 mb-0">
      {activeWorldSummary} · {activeOperationSummary}
    </p>

    <!-- 1. Rechenart-Auswahl (4 kindgerechte Tiles) -->
    <div class="mt-3.5 space-y-2">
      <div class="grid grid-cols-4 gap-1.5" role="group" aria-label="Rechenart auswählen">
        {#each operationOptions as opt (opt.id)}
          {@const isSelectedOp = practiceOperation === opt.id}
          <button
            type="button"
            onclick={() => {
              playKeyTap(soundEnabled);
              onSelectOperation?.(opt.id);
            }}
            aria-pressed={isSelectedOp}
            class="py-2 px-1 rounded-2xl border flex flex-col items-center justify-center gap-0.5 transition cursor-pointer active:scale-95 {
              isSelectedOp
                ? 'bg-[#e8f0ff] dark:bg-[#4c9aff]/20 border-[#0a6cff] dark:border-[#4c9aff] text-[#0a6cff] dark:text-[#4c9aff] shadow-2xs'
                : 'bg-[#f6f7f9] dark:bg-white/[0.06] border-transparent text-[#4b5563] dark:text-[#98989f] hover:text-[#0f1115] dark:hover:text-white'
            }"
          >
            <span class="text-sm sm:text-base leading-none">{opt.icon}</span>
            <span class="text-[10.5px] sm:text-[11px] font-extrabold leading-tight truncate max-w-full">
              {opt.label}
            </span>
          </button>
        {/each}
      </div>

      <!-- 2. Welten-Auswahl (kompakte Pills) -->
      <div class="flex items-center gap-1.5 flex-wrap" role="group" aria-label="Rechenwelt auswählen">
        {#each [1, 2, 3] as const as w (w)}
          {@const isLocked = w > unlockedWorldCount}
          {@const isSelectedWorld = effectiveWorldScope === w}
          <button
            type="button"
            onclick={() => {
              playKeyTap(soundEnabled);
              if (isLocked) {
                lockedWorldNotice = lockedWorldNotice === w ? null : w;
              } else {
                lockedWorldNotice = null;
                onSelectWorldScope?.(w);
              }
            }}
            aria-pressed={isSelectedWorld}
            class="text-[11px] font-extrabold px-3 py-1.5 rounded-full border transition cursor-pointer flex items-center gap-1 active:scale-95 {
              isSelectedWorld
                ? 'bg-[#0a6cff] dark:bg-[#4c9aff] text-white dark:text-[#00112b] border-transparent'
                : isLocked
                ? 'bg-[#f6f7f9] dark:bg-white/[0.04] text-[#9aa1ad] dark:text-[#6c6c74] border-transparent'
                : 'bg-[#f6f7f9] dark:bg-white/[0.07] text-[#4b5563] dark:text-[#98989f] border-transparent hover:text-[#0f1115] dark:hover:text-white'
            }"
          >
            <span>Welt {w}</span>
            {#if isLocked}
              <span class="text-[9.5px]">🔒</span>
            {/if}
          </button>
        {/each}

        {#if unlockedWorldCount >= 2}
          {@const isAllSelected = effectiveWorldScope === 'all'}
          <button
            type="button"
            onclick={() => {
              playKeyTap(soundEnabled);
              lockedWorldNotice = null;
              onSelectWorldScope?.('all');
            }}
            aria-pressed={isAllSelected}
            class="text-[11px] font-extrabold px-3 py-1.5 rounded-full border transition cursor-pointer active:scale-95 {
              isAllSelected
                ? 'bg-[#0a6cff] dark:bg-[#4c9aff] text-white dark:text-[#00112b] border-transparent'
                : 'bg-[#f6f7f9] dark:bg-white/[0.07] text-[#4b5563] dark:text-[#98989f] border-transparent hover:text-[#0f1115] dark:hover:text-white'
            }"
          >
            Alle
          </button>
        {/if}
      </div>

      {#if lockedWorldNotice !== null && lockedWorldNotice > unlockedWorldCount}
        <div class="text-[11px] font-semibold text-[#4b5563] dark:text-slate-300 bg-[#f6f7f9] dark:bg-white/[0.06] px-3 py-2 rounded-2xl animate-fade-in">
          🔒 Welt {lockedWorldNotice} schaltet sich frei, sobald 80 % von Welt {lockedWorldNotice - 1} hellgrün sind (oder über Optionen → Lernpfad: Frei).
        </div>
      {/if}

      <!-- Didaktische Beschreibung der ausgewählten Welt (direkt vor 'Los geht's') -->
      <div class="text-[11px] leading-relaxed text-[#4b5563] dark:text-slate-300 bg-[#f6f7f9] dark:bg-white/[0.05] p-2.5 rounded-2xl border border-black/[0.05] dark:border-white/[0.07] flex items-center gap-2 animate-fade-in">
        <span class="text-base shrink-0">{worldInfo.icon}</span>
        <span><strong>{worldInfo.title}:</strong> {worldInfo.desc}</span>
      </div>
    </div>

    <button
      type="button"
      onclick={onStartDailySession}
      class="mt-4 w-full h-[52px] bg-[#0a6cff] hover:bg-[#2b7fff] text-white dark:bg-[#4c9aff] dark:hover:bg-[#6aaeff] dark:text-[#00112b] font-extrabold text-[15px] rounded-full flex items-center justify-center gap-2 transition cursor-pointer border-none active:scale-[0.98]"
    >
      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5l12 7.5-12 7.5z"/></svg>
      <span>Los geht’s</span>
    </button>
  </section>

  <!-- 4. 10x10 RECHENTAFEL DIREKT AUF DEM HAUPTBILDSCHIRM -->
  <Heatmap
    {gameMode}
    {facts}
    {practiceOperation}
    practiceWorldScope={effectiveWorldScope}
    freeWorldChoice={activeProfile.freeWorldChoice ?? false}
    onPracticeFact={onPracticeFact}
    onStartChapterSession={onStartChapterSession}
    onStartRowSession={onStartRowSession}
  />

  <!-- 5. WEITERE TRAININGS-MODI: WACKELKANDIDATEN & 60s BLITZ-CHALLENGE -->
  <section class="space-y-2.5" aria-label="Weitere Trainingsmodi">
    <div class="px-1">
      <span class="text-sm font-extrabold tracking-tight text-[#0f1115] dark:text-white">
        Mehr üben
      </span>
    </div>

    <div class="grid grid-cols-2 gap-3">
      <!-- Wackelkandidaten-Trainer -->
      <button
        type="button"
        onclick={handleWeakSpotsClick}
        class="text-left p-3.5 rounded-[22px] bg-white dark:bg-[#1c1c1e] border border-black/[0.07] dark:border-white/[0.07] transition flex flex-col min-h-[140px] cursor-pointer active:scale-[0.98]"
      >
        <div class="flex items-center justify-between">
          <span class="w-9 h-9 rounded-xl flex items-center justify-center {
            weakSpotCount > 0
              ? 'bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300'
              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300'
          }">
            <svg class="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.5"/></svg>
          </span>
          <span class="text-[11px] font-extrabold px-2 py-0.5 rounded-full {
            weakSpotCount > 0
              ? 'bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-300'
              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300'
          }">
            {weakSpotCount > 0 ? `${weakSpotCount} offen` : 'Alles fest ✓'}
          </span>
        </div>
        <div class="font-extrabold text-sm tracking-tight text-[#0f1115] dark:text-white mt-3 leading-tight">
          Wackelkandidaten
        </div>
        <div class="text-xs text-[#6b7280] dark:text-[#98989f] mt-1 leading-snug">
          {weakSpotCount > 0 ? 'Schwierige Aufgaben üben' : 'Gerade nichts offen'}
        </div>
        <div class="mt-auto pt-2.5 text-xs font-extrabold flex items-center justify-between {
          weakSpotCount > 0
            ? 'text-amber-700 dark:text-amber-300'
            : 'text-emerald-700 dark:text-emerald-300'
        }">
          {#if weakSpotCount > 0}
            <span>Üben</span> <span>›</span>
          {:else}
            <span>Tippen für Info</span>
          {/if}
        </div>
      </button>

      <!-- 60s Blitz-Challenge -->
      <button
        type="button"
        onclick={onStartBlitz}
        class="text-left p-3.5 rounded-[22px] bg-white dark:bg-[#1c1c1e] border border-black/[0.07] dark:border-white/[0.07] transition cursor-pointer flex flex-col min-h-[140px] active:scale-[0.98]"
      >
        <div class="flex items-center justify-between">
          <span class="w-9 h-9 rounded-xl flex items-center justify-center bg-[#e8f0ff] text-[#0a6cff] dark:bg-[#4c9aff]/15 dark:text-[#4c9aff]">
            <svg class="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/></svg>
          </span>
          <span class="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-[#e8f0ff] text-[#0a6cff] dark:bg-[#4c9aff]/15 dark:text-[#4c9aff]">
            60 Sek.
          </span>
        </div>
        <div class="font-extrabold text-sm tracking-tight text-[#0f1115] dark:text-white mt-3 leading-tight">
          Blitz-Challenge
        </div>
        <div class="text-xs text-[#6b7280] dark:text-[#98989f] mt-1 leading-snug">
          Wie viele schaffst du?
        </div>
        <div class="mt-auto pt-2.5 text-xs font-extrabold text-[#0a6cff] dark:text-[#4c9aff] flex items-center justify-between">
          <span>Rekord {stats.blitzHighscore ?? 0}</span>
          <span>›</span>
        </div>
      </button>
    </div>
  </section>

  <!-- 6. FOOTER: OPTIONEN, IMPRESSUM & DATENSCHUTZ, RELOAD -->
  <footer class="pt-2 pb-4 px-1 flex items-center justify-between text-[#6b7280] dark:text-[#98989f] text-[11.5px]">
    <button
      type="button"
      onclick={() => (showParentalGate = true)}
      class="hover:text-[#0f1115] dark:hover:text-white flex items-center gap-1.5 bg-transparent border-none p-0 cursor-pointer text-[11.5px] font-semibold"
    >
      <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/></svg>
      <span>Optionen</span>
    </button>

    <button
      type="button"
      onclick={onOpenLegal}
      class="hover:text-[#0f1115] dark:hover:text-white bg-transparent border-none p-0 cursor-pointer text-[11.5px] font-semibold hover:underline"
    >
      Impressum &amp; Datenschutz
    </button>

    <div class="flex items-center gap-1.5 text-[11.5px]">
      <span>Version 3.0</span>
      <button
        type="button"
        onclick={() => window.location.reload()}
        class="hover:text-[#0f1115] dark:hover:text-white bg-transparent border-none p-0 cursor-pointer leading-none transition flex items-center"
        title="App neu laden (nach Updates)"
        aria-label="App neu laden"
      >
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 11-3-6.7L21 8"/><path d="M21 3v5h-5"/></svg>
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
    defaultAvatar={getProfileDefaultAvatar(activeProfile)}
    {soundEnabled}
    onSave={(unlocked, newStars, newBadge, newAvatar) => {
      onSaveStickers?.(unlocked, newStars, newBadge, newAvatar);
    }}
    onClose={() => (showStickerModal = false)}
  />
{/if}

<!-- LOB-MODAL: KEINE WACKELKANDIDATEN -->
{#if showNoWeakSpotsModal}
  <div
    class="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in select-none"
    role="dialog"
    aria-modal="true"
    aria-label="Keine Wackelkandidaten"
    tabindex="-1"
    onclick={(e) => {
      if (e.target === e.currentTarget) showNoWeakSpotsModal = false;
    }}
    onkeydown={(e) => {
      if (e.key === 'Escape') showNoWeakSpotsModal = false;
    }}
  >
    <div class="bg-white dark:bg-[#1c1c1e] w-full max-w-sm rounded-3xl p-6 border-2 border-emerald-400 dark:border-emerald-700 shadow-2xl text-center space-y-4 animate-scale-up">
      <div class="text-5xl animate-bounce">
        🌟
      </div>
      <div>
        <h3 class="text-lg font-black text-slate-900 dark:text-white m-0">
          Klasse Leistung!
        </h3>
        <p class="text-xs text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
          Du hast aktuell <strong>keine Wackelkandidaten</strong>! Alle Aufgaben, die du bisher gerechnet hast, sitzen schon sicher im Gedächtnis.
        </p>
      </div>

      <div class="p-3 bg-emerald-50 dark:bg-emerald-950/50 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-xs font-bold text-emerald-800 dark:text-emerald-300">
        Mach einfach mit der <strong>Tages-Mission</strong> weiter, um neue Aufgaben zu meistern! 🚀
      </div>

      <button
        type="button"
        onclick={() => (showNoWeakSpotsModal = false)}
        class="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs shadow-sm transition cursor-pointer border-none"
      >
        Super, verstanden! 👏
      </button>
    </div>
  </div>
{/if}
