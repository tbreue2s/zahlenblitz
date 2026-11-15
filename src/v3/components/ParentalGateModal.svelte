<script lang="ts">
  import { onMount } from 'svelte';
  import { hapticError, hapticSuccess, hapticTap } from '../lib/haptics';

  interface Props {
    title?: string;
    description?: string;
    onSuccess: () => void;
    onCancel: () => void;
  }

  let {
    title = 'Eltern-Bereich',
    description = 'Bestätige kurz, dass du erwachsen bist, um zu den Optionen zu gelangen.',
    onSuccess,
    onCancel,
  }: Props = $props();

  interface GateChallenge {
    question: string;
    task: string;
    solution: number;
  }

  function generateChallenge(): GateChallenge {
    // Zweistellige Multiplikationsaufgabe für Erwachsene (z. B. 17 × 4 = 68)
    // Grundschüler bis Klasse 3 beherrschen nur das 1x1 bis 10x10.
    const tensList = [14, 16, 17, 18, 19, 23, 24, 26, 27];
    const multList = [3, 4, 6, 7];
    const a = tensList[Math.floor(Math.random() * tensList.length)];
    const b = multList[Math.floor(Math.random() * multList.length)];
    return {
      question: 'Nur für Erwachsene: Löse die Rechenaufgabe:',
      task: `${a} × ${b} =`,
      solution: a * b,
    };
  }

  let challenge = $state<GateChallenge>(generateChallenge());
  let inputDigits = $state('');
  let errorMessage = $state<string | null>(null);

  function handleDigit(digit: string) {
    if (inputDigits.length >= 4) return;
    hapticTap();
    inputDigits += digit;
    errorMessage = null;
  }

  function handleDelete() {
    if (inputDigits.length === 0) return;
    hapticTap();
    inputDigits = inputDigits.slice(0, -1);
    errorMessage = null;
  }

  function handleCheck() {
    if (!inputDigits) return;
    const val = parseInt(inputDigits, 10);
    if (val === challenge.solution) {
      hapticSuccess();
      onSuccess();
    } else {
      hapticError();
      errorMessage = 'Das war leider nicht richtig. Bitte versuche die neue Aufgabe:';
      inputDigits = '';
      challenge = generateChallenge();
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key >= '0' && e.key <= '9') {
      e.preventDefault();
      handleDigit(e.key);
    } else if (e.key === 'Backspace' || e.key === 'Delete') {
      e.preventDefault();
      handleDelete();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      handleCheck();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  }

  onMount(() => {
    window.addEventListener('keydown', handleKeydown);
    return () => {
      window.removeEventListener('keydown', handleKeydown);
    };
  });
</script>

<div
  class="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in"
  onclick={(e) => {
    if (e.target === e.currentTarget) onCancel();
  }}
  onkeydown={(e) => {
    if (e.key === 'Escape') onCancel();
  }}
  tabindex="-1"
  role="dialog"
  aria-modal="true"
  aria-label="Kindersicherung: Eltern-Bereich"
>
  <div class="w-full max-w-sm bg-white dark:bg-[#141b2d] border-2 border-indigo-200 dark:border-indigo-900 rounded-3xl p-5 shadow-2xl space-y-4 animate-scale-up">
    <!-- Header -->
    <div class="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
      <div class="flex items-center gap-2">
        <span class="text-2xl">🔒</span>
        <div>
          <h3 class="text-sm font-black text-slate-900 dark:text-white m-0">
            {title}
          </h3>
          <span class="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            Kindersicherung (Parental Gate)
          </span>
        </div>
      </div>
      <button
        type="button"
        onclick={onCancel}
        class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white text-xs font-bold border-none cursor-pointer flex items-center justify-center"
      >
        ✕
      </button>
    </div>

    <!-- Info Text -->
    <p class="text-xs text-slate-600 dark:text-slate-300 leading-snug m-0">
      {description}
    </p>

    <!-- Challenge Card -->
    <div class="bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800 p-3.5 rounded-2xl text-center space-y-1">
      <span class="text-xs text-indigo-700 dark:text-indigo-300 font-bold block">
        {challenge.question}
      </span>
      <div class="text-xl sm:text-2xl font-black text-indigo-950 dark:text-indigo-100 py-1 tracking-wide">
        {challenge.task} ?
      </div>
    </div>

    <!-- Eingabe-Anzeige -->
    <div class="flex items-center justify-center h-12 bg-slate-100 dark:bg-slate-800/80 rounded-2xl border-2 {errorMessage ? 'border-rose-400 dark:border-rose-600' : 'border-slate-200 dark:border-slate-700'} px-4">
      <span class="text-2xl font-black tracking-widest text-slate-900 dark:text-white">
        {inputDigits || '—'}
      </span>
    </div>

    {#if errorMessage}
      <p class="text-[11px] font-bold text-rose-600 dark:text-rose-400 text-center m-0 animate-fade-in">
        {errorMessage}
      </p>
    {/if}

    <!-- Kompaktes 3x4 Tastenfeld -->
    <div class="grid grid-cols-3 gap-1.5 select-none">
      {#each ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as d}
        <button
          type="button"
          onclick={() => handleDigit(d)}
          class="h-11 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-base font-black border border-slate-200 dark:border-slate-700 cursor-pointer transition active:scale-95"
        >
          {d}
        </button>
      {/each}

      <!-- Löschen -->
      <button
        type="button"
        onclick={handleDelete}
        class="h-11 rounded-xl bg-slate-100 dark:bg-slate-800/60 hover:bg-slate-200 text-slate-600 dark:text-slate-300 text-sm font-bold border border-slate-200 dark:border-slate-700 cursor-pointer transition active:scale-95 flex items-center justify-center"
        aria-label="Ziffer löschen"
      >
        ⌫
      </button>

      <!-- Null -->
      <button
        type="button"
        onclick={() => handleDigit('0')}
        class="h-11 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 text-base font-black border border-slate-200 dark:border-slate-700 cursor-pointer transition active:scale-95"
      >
        0
      </button>

      <!-- Bestätigen -->
      <button
        type="button"
        onclick={handleCheck}
        disabled={!inputDigits}
        class="h-11 rounded-xl font-black text-sm border-none cursor-pointer transition active:scale-95 flex items-center justify-center {inputDigits ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs' : 'bg-slate-200 dark:bg-slate-800 text-slate-400 opacity-60 cursor-not-allowed'}"
        aria-label="Bestätigen"
      >
        ✓ Weiter
      </button>
    </div>

    <!-- Abbrechen-Button -->
    <button
      type="button"
      onclick={onCancel}
      class="w-full py-2 text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 bg-transparent border-none cursor-pointer"
    >
      Abbrechen und zurück zum Spiel
    </button>
  </div>
</div>
