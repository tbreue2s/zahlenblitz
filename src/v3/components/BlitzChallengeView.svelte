<script lang="ts">
  import { onDestroy, onMount } from 'svelte';
  import {
    playCelebrationSound,
    playErrorSound,
    playKeyTap,
    playSuccessSound,
  } from '../lib/audio';
  import {
    hapticCelebration,
    hapticError,
    hapticSuccess,
  } from '../lib/haptics';
  import type { QueuedTaskV3 } from '../lib/chapters';
  import { formatEquationPartsV3 } from '../lib/generator';
  import { buildBlitzChallengeQueueV3 } from '../lib/storage';
  import type { FactFamily } from '../lib/types';
  import Keypad from './Keypad.svelte';

  interface Props {
    facts: FactFamily[];
    currentHighscore: number;
    soundEnabled: boolean;
    onRecordHighscore: (score: number) => void;
    onAddStars: (stars: number) => void;
    onBack: () => void;
  }

  let {
    facts,
    currentHighscore,
    soundEnabled,
    onRecordHighscore,
    onAddStars,
    onBack,
  }: Props = $props();

  const TOTAL_SECONDS = 60;
  let secondsLeft = $state(TOTAL_SECONDS);
  let timerInterval: ReturnType<typeof setInterval> | null = null;

  let queue = $state<QueuedTaskV3[]>([]);
  let currentIndex = $state(0);
  let inputDigits = $state('');
  let score = $state(0);
  let mistakes = $state(0);
  let isGameOver = $state(false);
  let isNewHighscore = $state(false);
  let starsEarned = $state(0);
  let flashEffect = $state<'green' | 'red' | null>(null);

  let currentTask = $derived(queue[currentIndex]);
  let equationParts = $derived(
    currentTask ? formatEquationPartsV3(currentTask.fact, currentTask.variant) : null
  );

  function startTimer() {
    timerInterval = setInterval(() => {
      if (secondsLeft > 1) {
        secondsLeft--;
      } else {
        secondsLeft = 0;
        finishGame();
      }
    }, 1000);
  }

  function finishGame() {
    if (timerInterval) clearInterval(timerInterval);
    isGameOver = true;
    playCelebrationSound(soundEnabled);
    hapticCelebration();

    // Mindestens 1 Stern, +1 Stern je 3 richtige Antworten
    starsEarned = Math.max(1, Math.floor(score / 3));
    onAddStars(starsEarned);

    if (score > currentHighscore) {
      isNewHighscore = true;
      onRecordHighscore(score);
    }
  }

  function handleDigit(digit: string) {
    if (isGameOver || !equationParts) return;
    if (inputDigits.length >= 3) return;

    playKeyTap(soundEnabled);
    const nextInput = inputDigits + digit;
    inputDigits = nextInput;

    // Instant-Check: Sobald das richtige Ergebnis getippt wird, SOFORT weiterspringen!
    if (parseInt(nextInput, 10) === equationParts.solution) {
      handleSuccess();
    }
  }

  function handleDelete() {
    if (isGameOver) return;
    playKeyTap(soundEnabled);
    inputDigits = inputDigits.slice(0, -1);
  }

  function handleSubmit() {
    if (isGameOver || !equationParts) return;
    if (!inputDigits) return;

    const val = parseInt(inputDigits, 10);
    if (val === equationParts.solution) {
      handleSuccess();
    } else {
      handleMistake();
    }
  }

  function handleSuccess() {
    score++;
    playSuccessSound(soundEnabled, true);
    hapticSuccess();
    flashEffect = 'green';
    setTimeout(() => {
      flashEffect = null;
    }, 180);

    inputDigits = '';
    if (currentIndex + 1 < queue.length) {
      currentIndex++;
    } else {
      // Endlos Nachschub an Aufgaben
      queue = [...queue, ...buildBlitzChallengeQueueV3(facts, 30)];
      currentIndex++;
    }
  }

  function handleMistake() {
    mistakes++;
    playErrorSound(soundEnabled);
    hapticError();
    flashEffect = 'red';
    setTimeout(() => {
      flashEffect = null;
    }, 250);
    inputDigits = '';
  }

  function restartGame() {
    secondsLeft = TOTAL_SECONDS;
    score = 0;
    mistakes = 0;
    currentIndex = 0;
    inputDigits = '';
    isGameOver = false;
    isNewHighscore = false;
    flashEffect = null;
    queue = buildBlitzChallengeQueueV3(facts, 80);
    startTimer();
  }

  onMount(() => {
    queue = buildBlitzChallengeQueueV3(facts, 80);
    startTimer();
  });

  onDestroy(() => {
    if (timerInterval) clearInterval(timerInterval);
  });
</script>

<div class="w-full max-w-md mx-auto space-y-4 pb-6 select-none animate-fade-in">
  <!-- Top Nav: Abbruch, Timer & Live-Score -->
  <div class="flex items-center justify-between gap-3 text-xs">
    <button
      type="button"
      onclick={onBack}
      class="px-2.5 py-1.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-700/60 cursor-pointer"
    >
      ✕ Beenden
    </button>

    <!-- 60s Timer Pill -->
    <div
      class="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl border font-black text-xs transition-all {
        secondsLeft <= 10
          ? 'bg-rose-500 text-white border-rose-600 animate-pulse'
          : 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700'
      }"
    >
      <span>⏱️</span>
      <span class="tabular-nums font-mono text-sm">{secondsLeft}s</span>
    </div>

    <!-- Live Score -->
    <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-extrabold border border-indigo-200 dark:border-indigo-800">
      <span>⚡ {score}</span>
    </div>
  </div>

  <!-- Timer Fortschrittsbalken -->
  <div class="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
    <div
      class="h-full transition-all duration-300 {secondsLeft <= 10 ? 'bg-rose-500' : 'bg-amber-500'}"
      style="width: {Math.round((secondsLeft / TOTAL_SECONDS) * 100)}%"
    ></div>
  </div>

  {#if !isGameOver && currentTask && equationParts}
    <!-- AUFGABEN-KARTE -->
    <div class="bg-white dark:bg-[#111827] border-2 rounded-3xl p-6 sm:p-7 shadow-xl text-center space-y-4 transition-colors {
      flashEffect === 'green'
        ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-950/30'
        : flashEffect === 'red'
        ? 'border-rose-500 bg-rose-50/30 dark:bg-rose-950/30'
        : 'border-slate-200 dark:border-slate-800'
    }">
      <div class="flex items-center justify-between text-xs text-slate-400">
        <span class="font-extrabold text-[11px] text-indigo-500 uppercase tracking-wider">
          Blitz-Challenge
        </span>
        <span class="font-semibold text-[11px]">
          Rekord: {Math.max(currentHighscore, score)}
        </span>
      </div>

      <!-- Gleichung mit Eingabefeld -->
      <div class="flex items-center justify-center gap-2 text-4xl sm:text-5xl font-black text-slate-900 dark:text-white my-3 select-none">
        {#if equationParts.left}
          <span>{equationParts.left}</span>
        {/if}

        <div
          class="min-w-20 px-3 py-1 rounded-2xl border-2 text-center transition-all {
            flashEffect === 'green'
              ? 'border-emerald-500 bg-emerald-100 dark:bg-emerald-950 text-emerald-600'
              : flashEffect === 'red'
              ? 'border-rose-500 bg-rose-100 dark:bg-rose-950 text-rose-600'
              : 'border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/40 text-slate-900 dark:text-white'
          }"
        >
          {inputDigits || '?'}
        </div>

        {#if equationParts.right}
          <span>{equationParts.right}</span>
        {/if}
      </div>

      <div class="text-[11px] text-slate-400 font-medium">
        Tippe das Ergebnis – richtige Antworten springen automatisch weiter!
      </div>
    </div>

    <!-- Ziffernblock -->
    <Keypad
      disabled={isGameOver}
      canSubmit={inputDigits.length > 0}
      canDelete={inputDigits.length > 0}
      onDigit={handleDigit}
      onDelete={handleDelete}
      onSubmit={handleSubmit}
    />
  {:else if isGameOver}
    <!-- END-BILDSCHIRM / HIGHSCORE -->
    <div class="bg-white dark:bg-[#111827] border-2 border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-5 animate-fade-in">
      <div class="text-5xl animate-bounce">
        {isNewHighscore ? '🏆' : score >= 15 ? '⚡' : '🎉'}
      </div>

      <div>
        <h2 class="text-2xl font-black text-slate-900 dark:text-white m-0">
          {isNewHighscore ? 'Neuer persönlicher Rekord!' : 'Zeit abgelaufen!'}
        </h2>
        <p class="text-xs text-slate-400 mt-1">
          Klasse gerechnet in der 60-Sekunden-Challenge!
        </p>
      </div>

      <!-- Punkte-Übersicht -->
      <div class="grid grid-cols-2 gap-3 max-w-xs mx-auto">
        <div class="p-3 bg-indigo-50 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200 dark:border-indigo-800">
          <span class="text-[11px] font-bold text-indigo-400 block uppercase">Gelöst</span>
          <span class="text-3xl font-black text-indigo-600 dark:text-indigo-300">{score}</span>
        </div>
        <div class="p-3 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200 dark:border-amber-800">
          <span class="text-[11px] font-bold text-amber-500 block uppercase">Rekord</span>
          <span class="text-3xl font-black text-amber-600 dark:text-amber-400">
            {Math.max(currentHighscore, score)}
          </span>
        </div>
      </div>

      <!-- Belohnungs-Sterne -->
      <div class="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300">
        ⭐ Du hast dir <span class="text-amber-500 font-extrabold">+{starsEarned} Sterne</span> verdient!
      </div>

      <!-- Aktionen -->
      <div class="space-y-2 pt-2">
        <button
          type="button"
          onclick={restartGame}
          class="w-full py-3.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-sm border-none cursor-pointer shadow-md transition flex items-center justify-center gap-2"
        >
          <span>🔄</span>
          <span>Nochmal versuchen</span>
        </button>

        <button
          type="button"
          onclick={onBack}
          class="w-full py-2.5 px-4 rounded-xl bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 font-bold text-xs border-none cursor-pointer"
        >
          Zurück zur Übersicht
        </button>
      </div>
    </div>
  {/if}
</div>
