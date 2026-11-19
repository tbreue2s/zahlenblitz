<script lang="ts">
  import {
    ALL_STICKERS,
    findStickerById,
    getStickersByCategory,
    STICKER_CATEGORIES,
    type StickerCategory,
    type StickerItem,
  } from '../lib/stickers';
  import { playCelebrationSound, playKeyTap, triggerHaptic } from '../lib/audio';

  interface Props {
    initialStars: number;
    initialUnlockedStickers: string[];
    initialBadge?: string;
    initialAvatar: string;
    defaultAvatar: string;
    soundEnabled: boolean;
    onSave: (
      unlockedStickers: string[],
      newStars: number,
      newBadge?: string,
      newAvatar?: string
    ) => void;
    onClose: () => void;
  }

  let props: Props = $props();

  let tempStars = $state(0);
  let tempUnlocked = $state<string[]>([]);
  let tempBadge = $state<string | undefined>(undefined);
  let tempAvatar = $state<string>('');
  let initialized = false;

  $effect(() => {
    if (!initialized) {
      tempStars = props.initialStars;
      tempUnlocked = [...props.initialUnlockedStickers];
      tempBadge = props.initialBadge;
      tempAvatar = props.initialAvatar;
      initialized = true;
    }
  });
  let selectedCategory = $state<StickerCategory>('animals');
  let pendingPurchase = $state<StickerItem | null>(null);
  let selectedStickerForDetail = $state<StickerItem | null>(null);
  let saveSuccess = $state(false);

  let currentCategoryStickers = $derived(getStickersByCategory(selectedCategory));
  let totalStickerCount = ALL_STICKERS.length;
  let unlockedCount = $derived(tempUnlocked.length);
  let progressPercent = $derived(
    Math.round((unlockedCount / (totalStickerCount || 1)) * 100)
  );

  let isDefaultAvatarActive = $derived(
    tempAvatar === props.defaultAvatar && !tempBadge
  );

  function handleBuy(sticker: StickerItem) {
    if (tempStars < sticker.cost) return;
    if (tempUnlocked.includes(sticker.id)) return;

    tempStars -= sticker.cost;
    tempUnlocked = [...tempUnlocked, sticker.id];
    pendingPurchase = null;
    selectedStickerForDetail = sticker;

    triggerHaptic([30, 60, 40]);
    playCelebrationSound(props.soundEnabled);
  }

  function handleSetAvatar(sticker: StickerItem) {
    tempAvatar = sticker.emoji;
    tempBadge = sticker.id;
    playKeyTap(props.soundEnabled);
    triggerHaptic(15);
  }

  function handleResetToDefaultAvatar() {
    tempAvatar = props.defaultAvatar;
    tempBadge = undefined;
    playKeyTap(props.soundEnabled);
    triggerHaptic(20);
  }

  function handleSaveClick() {
    saveSuccess = true;
    playKeyTap(props.soundEnabled);
    triggerHaptic(25);
    setTimeout(() => {
      props.onSave(tempUnlocked, tempStars, tempBadge, tempAvatar);
      props.onClose();
    }, 450);
  }
</script>

<div
  class="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 animate-fade-in"
  onclick={(e) => {
    if (e.target === e.currentTarget) props.onClose();
  }}
  onkeydown={(e) => {
    if (e.key === 'Escape') props.onClose();
  }}
  tabindex="-1"
  role="dialog"
  aria-modal="true"
  aria-label="Sticker-Album und Belohnungen"
>
  <div class="w-full max-w-lg bg-white dark:bg-[#1c1c1e] border-2 border-amber-300/80 dark:border-amber-800/80 rounded-3xl p-4 sm:p-6 shadow-2xl max-h-[92dvh] flex flex-col space-y-3.5 animate-scale-up overflow-hidden">
    
    <!-- Header: Titel & Schließen -->
    <div class="flex items-center justify-between pb-2.5 border-b border-slate-100 dark:border-slate-800">
      <div>
        <h3 class="text-base sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-2 m-0">
          <span>✨</span>
          <span>Mein Sticker-Album</span>
        </h3>
        <p class="text-xs text-slate-400 m-0">
          Tausche deine Sterne gegen tolle Sammel-Sticker!
        </p>
      </div>

      <button
        type="button"
        onclick={props.onClose}
        class="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white text-xs font-bold border-none cursor-pointer flex items-center justify-center transition"
        title="Schließen"
        aria-label="Schließen"
      >
        ✕
      </button>
    </div>

    <!-- Sterne-Guthaben & Sammel-Fortschritt -->
    <div class="grid grid-cols-2 gap-2.5">
      <!-- Sterne-Konto -->
      <div class="p-3 bg-gradient-to-br from-amber-50 to-amber-100/60 dark:from-amber-950/40 dark:to-amber-900/30 rounded-2xl border border-amber-200 dark:border-amber-800/60 flex items-center gap-3 shadow-2xs">
        <span class="text-3xl drop-shadow animate-bounce">⭐</span>
        <div>
          <span class="text-[10px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wider block">
            Deine Sterne
          </span>
          <span class="text-xl font-black text-amber-950 dark:text-amber-100 leading-none">
            {tempStars}
          </span>
        </div>
      </div>

      <!-- Sticker-Sammelstand -->
      <div class="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700/60 flex flex-col justify-between">
        <div class="flex items-center justify-between text-xs">
          <span class="font-bold text-slate-600 dark:text-slate-300">
            Gesammelt:
          </span>
          <span class="font-black text-indigo-600 dark:text-indigo-400">
            {unlockedCount} / {totalStickerCount}
          </span>
        </div>
        <div class="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden mt-1.5">
          <div
            class="bg-gradient-to-r from-amber-400 via-rose-400 to-indigo-500 h-full rounded-full transition-all duration-300"
            style="width: {progressPercent}%"
          ></div>
        </div>
      </div>
    </div>

    <!-- Profilbild-Status & Wechsel zu Standard-Avatar -->
    <div class="p-2.5 sm:p-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/70 flex items-center justify-between gap-2.5">
      <div class="flex items-center gap-2.5 min-w-0">
        <div class="relative w-10 h-10 rounded-2xl bg-white dark:bg-slate-800 border-2 {isDefaultAvatarActive ? 'border-emerald-300 dark:border-emerald-700' : 'border-amber-400 dark:border-amber-600 ring-2 ring-amber-300/40'} flex items-center justify-center text-2xl shadow-2xs shrink-0">
          <span>{tempAvatar}</span>
          {#if !isDefaultAvatarActive}
            <span class="absolute -top-1.5 -right-1.5 text-[10px]" title="Sticker als Profilbild aktiv">✨</span>
          {/if}
        </div>
        <div class="min-w-0">
          <span class="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-400 block truncate">
            Profilbild
          </span>
          <span class="text-xs font-black text-slate-800 dark:text-slate-100 block truncate">
            {#if isDefaultAvatarActive}
              Standard-Avatar ({props.defaultAvatar})
            {:else}
              Sticker als Profilbild aktiv
            {/if}
          </span>
        </div>
      </div>

      {#if !isDefaultAvatarActive}
        <button
          type="button"
          onclick={handleResetToDefaultAvatar}
          class="px-2.5 sm:px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/80 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-[11px] font-black cursor-pointer flex items-center gap-1.5 transition shrink-0 card-press"
          title="Zurück zum Standard-Profilbild ({props.defaultAvatar})"
        >
          <span>↺</span>
          <span>Standard ({props.defaultAvatar})</span>
        </button>
      {:else}
        <span class="text-[11px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-950/80 px-2.5 py-1 rounded-xl border border-emerald-300/80 dark:border-emerald-800/80 shrink-0 flex items-center gap-1">
          <span>✓</span>
          <span>Aktiv</span>
        </span>
      {/if}
    </div>

    <!-- Kategorie-Tabs -->
    <div class="flex items-center gap-1.5 overflow-x-auto pb-0.5 no-scrollbar text-xs">
      {#each STICKER_CATEGORIES as cat}
        {@const isCatActive = selectedCategory === cat.id}
        {@const catCount = ALL_STICKERS.filter((s) => s.category === cat.id && tempUnlocked.includes(s.id)).length}
        {@const catTotal = ALL_STICKERS.filter((s) => s.category === cat.id).length}
        <button
          type="button"
          onclick={() => {
            selectedCategory = cat.id;
            selectedStickerForDetail = null;
          }}
          class="px-3 py-1.5 rounded-xl border text-[11px] font-black transition cursor-pointer flex items-center gap-1.5 shrink-0 {
            isCatActive
              ? 'bg-indigo-600 text-white border-indigo-600 shadow-2xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-slate-400'
          }"
        >
          <span>{cat.icon}</span>
          <span>{cat.label}</span>
          <span class="text-[9.5px] px-1 py-0.2 rounded-full {
            isCatActive
              ? 'bg-indigo-800 text-indigo-100'
              : 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-300'
          }">
            {catCount}/{catTotal}
          </span>
        </button>
      {/each}
    </div>

    <!-- Scrollbarer Sticker-Bereich -->
    <div class="flex-1 overflow-y-auto space-y-3 pr-0.5 min-h-[220px]">
      
      <!-- Sticker-Grid (3 Spalten) -->
      <div class="grid grid-cols-3 gap-2.5 sm:gap-3">
        {#each currentCategoryStickers as sticker (sticker.id)}
          {@const isUnlocked = tempUnlocked.includes(sticker.id)}
          {@const isSelectedAvatar = tempAvatar === sticker.emoji}
          {@const canAfford = tempStars >= sticker.cost}

          <button
            type="button"
            onclick={() => {
              if (isUnlocked) {
                selectedStickerForDetail = sticker;
              } else if (canAfford) {
                pendingPurchase = sticker;
              } else {
                selectedStickerForDetail = sticker;
              }
            }}
            class="card-press relative p-2 sm:p-2.5 rounded-2xl border flex flex-col items-center justify-between text-center transition cursor-pointer {
              isSelectedAvatar
                ? 'bg-amber-100/80 dark:bg-amber-950/60 border-amber-400 dark:border-amber-600 ring-2 ring-amber-400 shadow-sm'
                : isUnlocked
                ? 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-indigo-400 hover:shadow-xs'
                : canAfford
                ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-300/80 dark:border-amber-800/60 hover:bg-amber-100/50'
                : 'bg-slate-50/80 dark:bg-slate-900/40 border-slate-200/60 dark:border-slate-800 opacity-60'
            }"
          >
            <!-- Badge: Gekauft oder Schloss -->
            {#if isSelectedAvatar}
              <span class="absolute top-1.5 right-1.5 text-[10px]" title="Aktives Profil-Bild">
                👑
              </span>
            {:else if isUnlocked}
              <span class="absolute top-1.5 right-1.5 text-emerald-600 dark:text-emerald-400 text-[10px] font-black">
                ✓
              </span>
            {:else}
              <span class="absolute top-1.5 right-1.5 text-[9px] text-slate-400">
                🔒
              </span>
            {/if}

            <!-- Emoji-Icon -->
            <div class="text-3xl sm:text-4xl py-1 transform transition group-hover:scale-110 {
              !isUnlocked ? 'filter grayscale contrast-75 opacity-70' : ''
            }">
              {sticker.emoji}
            </div>

            <!-- Name -->
            <div class="font-extrabold text-[11px] text-slate-900 dark:text-slate-100 leading-tight w-full truncate mt-1">
              {sticker.name}
            </div>

            <!-- Preis oder Status -->
            <div class="mt-1.5 w-full">
              {#if isUnlocked}
                <span class="text-[9.5px] font-extrabold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-1.5 py-0.5 rounded-full block truncate">
                  Im Album
                </span>
              {:else}
                {@const missingStars = sticker.cost - tempStars}
                <span class="text-[10px] font-black px-1.5 py-0.5 rounded-full flex items-center justify-center gap-1 {
                  canAfford
                    ? 'bg-amber-200 text-amber-900 dark:bg-amber-900/70 dark:text-amber-200 shadow-2xs'
                    : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }">
                  <span>⭐</span>
                  <span>{sticker.cost}</span>
                  {#if !canAfford}
                    <span class="text-[9px] font-bold text-amber-700 dark:text-amber-400">
                      (noch {missingStars})
                    </span>
                  {/if}
                </span>
              {/if}
            </div>
          </button>
        {/each}
      </div>

      <!-- Detail-Vorschau bei Klick auf einen Sticker -->
      {#if selectedStickerForDetail}
        {@const isUnlocked = tempUnlocked.includes(selectedStickerForDetail.id)}
        {@const isSelectedAvatar = tempAvatar === selectedStickerForDetail.emoji}
        {@const canAfford = tempStars >= selectedStickerForDetail.cost}

        <div class="p-3 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200 dark:border-indigo-800/60 animate-fade-in space-y-2">
          <div class="flex items-center justify-between gap-2">
            <div class="flex items-center gap-2.5">
              <span class="text-3xl">{selectedStickerForDetail.emoji}</span>
              <div>
                <div class="font-black text-xs text-indigo-950 dark:text-indigo-100 flex items-center gap-1.5">
                  <span>{selectedStickerForDetail.name}</span>
                  {#if isUnlocked}
                    <span class="text-[10px] text-emerald-600 font-extrabold">✓ Freigeschaltet</span>
                  {/if}
                </div>
                <div class="text-[11px] text-indigo-800/80 dark:text-indigo-300/80 leading-snug">
                  {selectedStickerForDetail.description}
                </div>
              </div>
            </div>

            <button
              type="button"
              onclick={() => (selectedStickerForDetail = null)}
              class="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs border-none cursor-pointer flex items-center justify-center"
            >
              ✕
            </button>
          </div>

          <div class="flex items-center justify-between gap-2 pt-1 border-t border-indigo-200/60 dark:border-indigo-800/40">
            {#if isUnlocked}
              <div class="flex gap-2 w-full">
                <button
                  type="button"
                  onclick={() => selectedStickerForDetail && handleSetAvatar(selectedStickerForDetail)}
                  class="flex-1 py-1.5 px-3 rounded-xl text-xs font-black border-none cursor-pointer flex items-center justify-center gap-1.5 transition {
                    isSelectedAvatar
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                  }"
                >
                  <span>{isSelectedAvatar ? '👑 Als Profilbild aktiv' : '✨ Als Profilbild nutzen'}</span>
                </button>

                {#if isSelectedAvatar}
                  <button
                    type="button"
                    onclick={handleResetToDefaultAvatar}
                    class="py-1.5 px-3 rounded-xl bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 text-xs font-black border-none cursor-pointer flex items-center gap-1 transition shrink-0 card-press"
                    title="Zurück zum Standard-Profilbild ({props.defaultAvatar})"
                  >
                    <span>↺</span>
                    <span>Standard ({props.defaultAvatar})</span>
                  </button>
                {/if}
              </div>
            {:else if canAfford}
              <button
                type="button"
                onclick={() => {
                  pendingPurchase = selectedStickerForDetail;
                }}
                class="w-full py-1.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-xs font-black border-none cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
              >
                <span>⭐ Für {selectedStickerForDetail.cost} Sterne kaufen</span>
              </button>
            {:else}
              {@const needed = selectedStickerForDetail.cost - tempStars}
              <div class="w-full p-2.5 rounded-xl bg-amber-100/90 dark:bg-amber-950/70 border border-amber-300 dark:border-amber-700 text-center space-y-0.5 animate-fade-in">
                <div class="text-xs font-black text-amber-900 dark:text-amber-200 flex items-center justify-center gap-1.5">
                  <span>🔒</span>
                  <span>Noch {needed} ⭐ sammeln!</span>
                </div>
                <div class="text-[10px] text-amber-800 dark:text-amber-300 font-semibold">
                  Du hast {tempStars} von {selectedStickerForDetail.cost} Sternen. Übe fleißig weiter! 🚀
                </div>
              </div>
            {/if}
          </div>
        </div>
      {/if}
    </div>

    <!-- KAUF-BESTÄTIGUNG (MODAL OVERLAY) -->
    {#if pendingPurchase}
      <div class="p-3.5 bg-amber-50 dark:bg-amber-950/60 rounded-2xl border-2 border-amber-300 dark:border-amber-700 space-y-2.5 animate-scale-up shadow-lg">
        <div class="flex items-center gap-2 text-amber-900 dark:text-amber-200">
          <span class="text-2xl">{pendingPurchase.emoji}</span>
          <div>
            <span class="text-xs font-black block">
              Sticker „{pendingPurchase.name}“ freischalten?
            </span>
            <span class="text-[10px] text-amber-700 dark:text-amber-300">
              Kostet {pendingPurchase.cost} ⭐ · Du hast danach noch {tempStars - pendingPurchase.cost} ⭐ übrig
            </span>
          </div>
        </div>

        <div class="flex gap-2">
          <button
            type="button"
            onclick={() => pendingPurchase && handleBuy(pendingPurchase)}
            class="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black border-none cursor-pointer flex items-center justify-center gap-1 shadow-xs"
          >
            <span>🎉 Ja, freischalten!</span>
          </button>
          <button
            type="button"
            onclick={() => (pendingPurchase = null)}
            class="py-2 px-3 rounded-xl bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold border-none cursor-pointer"
          >
            Abbrechen
          </button>
        </div>
      </div>
    {/if}

    <!-- Fußleiste mit prominentem SPEICHERN-Button -->
    <div class="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
      {#if saveSuccess}
        <div class="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-xs font-black text-center animate-fade-in flex items-center justify-center gap-1.5">
          <span>✓</span>
          <span>Erfolgreich gespeichert! ✨</span>
        </div>
      {:else}
        <button
          type="button"
          onclick={handleSaveClick}
          class="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 via-indigo-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-black text-xs sm:text-sm rounded-xl border-none cursor-pointer flex items-center justify-center gap-2 shadow-sm transition card-press"
        >
          <span>💾</span>
          <span>Sticker-Album speichern &amp; Fertig ✓</span>
        </button>
      {/if}
    </div>

  </div>
</div>
