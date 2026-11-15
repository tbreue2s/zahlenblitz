<script lang="ts">
  import { onDestroy } from 'svelte';
  import type { FactFamily, TaskVariant } from '../lib/types';

  interface Props {
    fact: FactFamily;
    variant: TaskVariant;
  }

  let { fact, variant }: Props = $props();

  let a = $derived(fact.a);
  let b = $derived(fact.b);
  let c = $derived(fact.c);
  let isSub = $derived(
    variant === 'sub' || variant === 'gap_sub_b' || variant === 'gap_sub_c'
  );

  // 4 Fünferblöcke für das klassische 20er-Feld:
  // Zeile 1: Block 1 (1..5), Block 2 (6..10)
  // Zeile 2: Block 3 (11..15), Block 4 (16..20)
  const block1 = [1, 2, 3, 4, 5];
  const block2 = [6, 7, 8, 9, 10];
  const block3 = [11, 12, 13, 14, 15];
  const block4 = [16, 17, 18, 19, 20];

  let isOverTenAdd = $derived(!isSub && a < 10 && c > 10);
  let isOverTenSub = $derived(isSub && c > 10 && a < 10);

  let toTen = $derived(10 - a);
  let restAdd = $derived(b - (10 - a));
  let fromRow2 = $derived(c - 10);
  let restSub = $derived(b - (c - 10));

  function getDotState(idx: number): 'blue' | 'red' | 'subtracted' | 'empty' {
    if (!isSub) {
      if (idx <= a) return 'blue';
      if (idx <= c) return 'red';
      return 'empty';
    } else {
      if (idx <= a) return 'blue';
      if (idx <= c) return 'subtracted';
      return 'empty';
    }
  }

  function isBridgeDot(idx: number): boolean {
    if (isOverTenAdd) {
      // Punkte, die Reihe 1 zur 10 auffüllen (Zehnerstopp-Brücke)
      return idx > a && idx <= 10;
    }
    if (isOverTenSub) {
      // Punkte in Reihe 2, die zuerst weggenommen werden (Rückwärts zur 10)
      return idx > 10 && idx <= c;
    }
    return false;
  }

  let steps = $derived.by(() => {
    if (!isSub) {
      if (isOverTenAdd) {
        return {
          hasSteps: true,
          badge: 'Zehnerstopp ⚡',
          step1: `${a} + ${toTen} = 10`,
          step2: `10 + ${restAdd} = ${c}`,
          spoken: `Erst zur zehn: ${a} plus ${toTen} ist gleich 10. Dann der Rest: 10 plus ${restAdd} ist gleich ${c}.`,
        };
      }
      if (c === 10) {
        return {
          hasSteps: false,
          badge: 'Verliebte Zahlen ❤️',
          step1: `${a} + ${b} = 10`,
          step2: '',
          spoken: `Verliebte Zahlen: ${a} und ${b} ergeben zusammen 10.`,
        };
      }
      return {
        hasSteps: false,
        badge: 'Plus bis 10',
        step1: `${a} + ${b} = ${c}`,
        step2: '',
        spoken: `${a} plus ${b} ist gleich ${c}.`,
      };
    } else {
      if (isOverTenSub) {
        return {
          hasSteps: true,
          badge: 'Zehnerstopp ⚡',
          step1: `${c} − ${fromRow2} = 10`,
          step2: `10 − ${restSub} = ${a}`,
          spoken: `Erst zurück zur zehn: ${c} minus ${fromRow2} ist gleich 10. Dann der Rest: 10 minus ${restSub} ist gleich ${a}.`,
        };
      }
      return {
        hasSteps: false,
        badge: 'Minus',
        step1: `${c} − ${b} = ${a}`,
        step2: '',
        spoken: `${c} minus ${b} ist gleich ${a}.`,
      };
    }
  });

  let isSpeaking = $state(false);

  function handleSpeak() {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      isSpeaking = false;
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(steps.spoken);
    utterance.lang = 'de-DE';
    utterance.rate = 0.88; // Ruhiges, kindgerechtes Sprechtempo
    utterance.onend = () => {
      isSpeaking = false;
    };
    utterance.onerror = () => {
      isSpeaking = false;
    };
    isSpeaking = true;
    window.speechSynthesis.speak(utterance);
  }

  onDestroy(() => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  });
</script>

<div class="my-2.5 p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 select-none">
  <div class="flex items-center justify-between text-[11px] font-black text-indigo-950 dark:text-indigo-200 mb-2">
    <span class="flex items-center gap-1.5">
      <span>🔵🔴 20er-Punktefeld</span>
      <span class="text-[9.5px] px-1.5 py-0.5 rounded-full bg-indigo-200/80 dark:bg-indigo-900/60 text-indigo-900 dark:text-indigo-200 font-bold">
        {steps.badge}
      </span>
    </span>
    <span class="text-[10px] text-slate-400 font-semibold">Kraft der 5</span>
  </div>

  <!-- 20er Feld Container: 2 Zeilen à 2 Fünferblöcke -->
  <div class="space-y-2 max-w-xs mx-auto">
    <!-- Zeile 1: 1 bis 10 -->
    <div class="flex items-center justify-between p-1.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
      <!-- Block 1: 1..5 -->
      <div class="grid grid-cols-5 gap-1.5 flex-1">
        {#each block1 as idx}
          {@const st = getDotState(idx)}
          {@const bridge = isBridgeDot(idx)}
          <div
            class="aspect-square w-full rounded-full flex items-center justify-center transition-all box-border {
              bridge
                ? 'bg-rose-500 border-2 border-amber-300 ring-2 ring-amber-400 dark:ring-amber-300 shadow-md animate-pulse'
                : st === 'blue'
                ? 'bg-blue-500 border-2 border-blue-600 shadow-xs'
                : st === 'red'
                ? 'bg-rose-500 border-2 border-rose-600 shadow-xs'
                : st === 'subtracted'
                ? 'bg-rose-100 dark:bg-rose-950/80 border-2 border-rose-300 dark:border-rose-700 text-rose-600 font-black text-[10px]'
                : 'border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40'
            }"
            title="Feld {idx}"
          >
            {#if st === 'subtracted'}
              ✕
            {/if}
          </div>
        {/each}
      </div>

      <!-- Fünfer-Trennlinie -->
      <div class="w-0.5 h-6 bg-slate-300 dark:bg-slate-700 mx-2 rounded-full shrink-0"></div>

      <!-- Block 2: 6..10 -->
      <div class="grid grid-cols-5 gap-1.5 flex-1">
        {#each block2 as idx}
          {@const st = getDotState(idx)}
          {@const bridge = isBridgeDot(idx)}
          <div
            class="aspect-square w-full rounded-full flex items-center justify-center transition-all box-border {
              bridge
                ? 'bg-rose-500 border-2 border-amber-300 ring-2 ring-amber-400 dark:ring-amber-300 shadow-md animate-pulse'
                : st === 'blue'
                ? 'bg-blue-500 border-2 border-blue-600 shadow-xs'
                : st === 'red'
                ? 'bg-rose-500 border-2 border-rose-600 shadow-xs'
                : st === 'subtracted'
                ? 'bg-rose-100 dark:bg-rose-950/80 border-2 border-rose-300 dark:border-rose-700 text-rose-600 font-black text-[10px]'
                : 'border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40'
            }"
            title="Feld {idx}"
          >
            {#if st === 'subtracted'}
              ✕
            {/if}
          </div>
        {/each}
      </div>
    </div>

    <!-- Zeile 2: 11 bis 20 -->
    <div class="flex items-center justify-between p-1.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">
      <!-- Block 3: 11..15 -->
      <div class="grid grid-cols-5 gap-1.5 flex-1">
        {#each block3 as idx}
          {@const st = getDotState(idx)}
          {@const bridge = isBridgeDot(idx)}
          <div
            class="aspect-square w-full rounded-full flex items-center justify-center transition-all box-border {
              bridge
                ? 'bg-rose-100 dark:bg-rose-950/80 border-2 border-amber-400 ring-2 ring-amber-400 text-rose-700 font-black text-[10px] shadow-md animate-pulse'
                : st === 'blue'
                ? 'bg-blue-500 border-2 border-blue-600 shadow-xs'
                : st === 'red'
                ? 'bg-rose-500 border-2 border-rose-600 shadow-xs'
                : st === 'subtracted'
                ? 'bg-rose-100 dark:bg-rose-950/80 border-2 border-rose-300 dark:border-rose-700 text-rose-600 font-black text-[10px]'
                : 'border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40'
            }"
            title="Feld {idx}"
          >
            {#if st === 'subtracted'}
              ✕
            {/if}
          </div>
        {/each}
      </div>

      <!-- Fünfer-Trennlinie -->
      <div class="w-0.5 h-6 bg-slate-300 dark:bg-slate-700 mx-2 rounded-full shrink-0"></div>

      <!-- Block 4: 16..20 -->
      <div class="grid grid-cols-5 gap-1.5 flex-1">
        {#each block4 as idx}
          {@const st = getDotState(idx)}
          {@const bridge = isBridgeDot(idx)}
          <div
            class="aspect-square w-full rounded-full flex items-center justify-center transition-all box-border {
              bridge
                ? 'bg-rose-100 dark:bg-rose-950/80 border-2 border-amber-400 ring-2 ring-amber-400 text-rose-700 font-black text-[10px] shadow-md animate-pulse'
                : st === 'blue'
                ? 'bg-blue-500 border-2 border-blue-600 shadow-xs'
                : st === 'red'
                ? 'bg-rose-500 border-2 border-rose-600 shadow-xs'
                : st === 'subtracted'
                ? 'bg-rose-100 dark:bg-rose-950/80 border-2 border-rose-300 dark:border-rose-700 text-rose-600 font-black text-[10px]'
                : 'border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/40'
            }"
            title="Feld {idx}"
          >
            {#if st === 'subtracted'}
              ✕
            {/if}
          </div>
        {/each}
      </div>
    </div>
  </div>

  <!-- 2-Schritt Didaktik-Leiste & Vorlese-Knopf -->
  <div class="mt-2.5 flex items-center justify-between gap-1.5 bg-white dark:bg-slate-900/90 p-2 rounded-xl border border-indigo-100 dark:border-indigo-900/60">
    <div class="flex items-center gap-1.5 flex-wrap text-xs">
      {#if steps.hasSteps}
        <div class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 font-black">
          <span class="text-[10px] text-amber-600 dark:text-amber-400 font-extrabold">1.</span>
          <span>{steps.step1}</span>
        </div>
        <span class="text-xs font-black text-slate-400">➔</span>
        <div class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 font-black">
          <span class="text-[10px] text-emerald-600 dark:text-emerald-400 font-extrabold">2.</span>
          <span>{steps.step2}</span>
        </div>
      {:else}
        <div class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 text-indigo-950 dark:text-indigo-200 font-black">
          <span>{steps.step1}</span>
        </div>
      {/if}
    </div>

    <!-- Optionaler Vorlese-Knopf -->
    <button
      type="button"
      onclick={handleSpeak}
      class="px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold flex items-center gap-1 cursor-pointer transition shrink-0"
      title="Rechenschritte vorlesen lassen 🔊"
      aria-label="Rechenschritte vorlesen"
    >
      <span>{isSpeaking ? '⏹️' : '🔊'}</span>
      <span class="text-[10px] font-black">{isSpeaking ? 'Stopp' : 'Vorlesen'}</span>
    </button>
  </div>
</div>
