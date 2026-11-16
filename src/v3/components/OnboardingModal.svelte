<script lang="ts">
  import { AVAILABLE_AVATARS } from '../lib/storage';
  import type { GameMode } from '../lib/types';
  import { playKeyTap, playSuccessSound } from '../lib/audio';

  interface Props {
    initialName?: string;
    initialAvatar?: string;
    initialMode?: GameMode;
    soundEnabled?: boolean;
    onComplete: (name: string, avatar: string, mode: GameMode) => void;
  }

  let {
    initialName = '',
    initialAvatar = '🦊',
    initialMode = 'plusminus',
    soundEnabled = true,
    onComplete,
  }: Props = $props();

  let name = $state('');
  let selectedAvatar = $state('🦊');
  let selectedMode = $state<GameMode>('plusminus');
  let initialized = $state(false);

  $effect(() => {
    if (!initialized) {
      name = initialName ?? '';
      selectedAvatar = initialAvatar ?? '🦊';
      selectedMode = initialMode ?? 'plusminus';
      initialized = true;
    }
  });

  function handleSelectMode(mode: GameMode) {
    selectedMode = mode;
    playKeyTap(soundEnabled);
  }

  function handleSelectAvatar(av: string) {
    selectedAvatar = av;
    playKeyTap(soundEnabled);
  }

  function handleSubmit() {
    playSuccessSound(soundEnabled, false);
    const finalName = name.trim() || (selectedMode === 'plusminus' ? 'Zahlen-Held' : '1x1 Meister');
    onComplete(finalName, selectedAvatar, selectedMode);
  }
</script>

<div
  class="fixed inset-0 bg-black/70 backdrop-blur-xs z-50 flex items-center justify-center p-3.5 sm:p-4 select-none animate-fade-in"
  role="dialog"
  aria-modal="true"
  aria-label="Willkommen bei ZahlenBlitz"
>
  <div class="bg-white dark:bg-[#1c1c1e] w-full max-w-md rounded-3xl p-5 sm:p-6 border-2 border-indigo-500/30 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto">
    <!-- Header -->
    <div class="text-center space-y-1">
      <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 text-xs font-black">
        <span>👋</span>
        <span>Willkommen bei ZahlenBlitz!</span>
      </div>
      <h2 class="text-xl sm:text-2xl font-black text-slate-900 dark:text-white m-0 pt-1">
        Dein Rechen-Abenteuer
      </h2>
      <p class="text-xs text-slate-500 dark:text-slate-400 m-0">
        Wähle deine Klassenstufe und deinen Lieblings-Avatar:
      </p>
    </div>

    <!-- 1. MODUS-AUSWAHL (Zahlen-Held ist VORBELEGT für 1. Klasse) -->
    <div class="space-y-2">
      <span class="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block px-0.5">
        1. Wähle dein Level
      </span>

      <div class="grid grid-cols-1 gap-2.5">
        <!-- Option A: Zahlen-Held (1. Klasse) - VORBELEGT -->
        <button
          type="button"
          onclick={() => handleSelectMode('plusminus')}
          class="card-press w-full text-left p-3.5 rounded-2xl border-2 transition cursor-pointer flex items-center gap-3.5 {
            selectedMode === 'plusminus'
              ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/60 shadow-sm ring-2 ring-indigo-400/40'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300'
          }"
        >
          <div class="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center text-2xl font-black shrink-0">
            ➕
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-1">
              <span class="font-black text-sm text-slate-900 dark:text-white">
                Zahlen-Held
              </span>
              <span class="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200">
                1. Klasse ⭐
              </span>
            </div>
            <div class="text-[11px] text-slate-600 dark:text-slate-300 font-medium mt-0.5 leading-snug">
              Plus &amp; Minus bis 20 · Verliebte Zahlen &amp; Zehnerstopp
            </div>
          </div>
        </button>

        <!-- Option B: 1x1 Meister (2. & 3. Klasse) -->
        <button
          type="button"
          onclick={() => handleSelectMode('mult')}
          class="card-press w-full text-left p-3.5 rounded-2xl border-2 transition cursor-pointer flex items-center gap-3.5 {
            selectedMode === 'mult'
              ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/60 shadow-sm ring-2 ring-indigo-400/40'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300'
          }"
        >
          <div class="w-12 h-12 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-2xl font-black shrink-0">
            ✖️
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center justify-between gap-1">
              <span class="font-black text-sm text-slate-900 dark:text-white">
                1x1 Meister
              </span>
              <span class="text-[10px] font-black px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200">
                2. &amp; 3. Klasse
              </span>
            </div>
            <div class="text-[11px] text-slate-600 dark:text-slate-300 font-medium mt-0.5 leading-snug">
              Malnehmen &amp; Geteilt bis 100 · Kernaufgaben &amp; Königsreihen
            </div>
          </div>
        </button>
      </div>
    </div>

    <!-- 2. NAME DES KINDES -->
    <div class="space-y-1.5">
      <span class="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block px-0.5">
        2. Dein Spieler-Name
      </span>
      <input
        type="text"
        bind:value={name}
        placeholder={selectedMode === 'plusminus' ? 'Z.B. Leo oder Sophie' : 'Z.B. Maya oder Felix'}
        maxlength={20}
        class="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm font-bold text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
      />
    </div>

    <!-- 3. AVATAR-AUSWAHL -->
    <div class="space-y-1.5">
      <span class="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 block px-0.5">
        3. Wähle deinen Avatar
      </span>
      <div class="grid grid-cols-6 gap-2 p-2 bg-slate-50 dark:bg-slate-900/70 rounded-2xl border border-slate-200 dark:border-slate-800">
        {#each AVAILABLE_AVATARS as av}
          <button
            type="button"
            onclick={() => handleSelectAvatar(av)}
            class="aspect-square text-2xl rounded-xl border-2 flex items-center justify-center transition cursor-pointer {
              selectedAvatar === av
                ? 'border-indigo-600 bg-indigo-100 dark:bg-indigo-950 scale-105 shadow-xs'
                : 'border-transparent hover:bg-slate-200 dark:hover:bg-slate-800'
            }"
            aria-label="Avatar {av}"
          >
            {av}
          </button>
        {/each}
      </div>
    </div>

    <!-- START-BUTTON -->
    <div class="pt-2">
      <button
        type="button"
        onclick={handleSubmit}
        class="w-full py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-md transition btn-calm-primary cursor-pointer border-none"
      >
        <span>Los geht's!</span>
        <span>🚀</span>
      </button>
      <p class="text-[10px] text-center text-slate-400 mt-2">
        Kann später jederzeit im Eltern-Bereich ⚙️🔒 geändert werden.
      </p>
    </div>
  </div>
</div>
