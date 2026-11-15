<script lang="ts">
  import { onMount } from 'svelte';
  import { playKeyTap } from './lib/audio';
  import {
    buildChapterSessionQueueV3,
    type QueuedTaskV3,
    type WorldChapterV3,
  } from './lib/chapters';
  import { selectTaskVariant } from './lib/generator';
  import {
    buildDailySessionQueueV3,
    buildWeakSpotsSessionQueueV3,
    checkNeedsOnboardingV3,
    createNewProfileV3,
    loadV3ProfilesAndActiveId,
    ONBOARDING_COMPLETED_KEY,
    registerDailyPracticeV3,
    saveV3ProfilesAndActiveId,
  } from './lib/storage';
  import type { FactFamily, GameMode, UserProfileV3, UserStatsV3 } from './lib/types';
  import HomeView from './components/HomeView.svelte';
  import PracticeView from './components/PracticeView.svelte';
  import BlitzChallengeView from './components/BlitzChallengeView.svelte';
  import UserModal from './components/UserModal.svelte';
  import OnboardingModal from './components/OnboardingModal.svelte';
  import LegalView from '../components/LegalView.svelte';

  type Screen = 'home' | 'practice' | 'users' | 'legal' | 'blitz';

  let currentScreen = $state<Screen>('home');
  let loaded = loadV3ProfilesAndActiveId();
  let profiles = $state<UserProfileV3[]>(loaded.profiles);
  let activeProfileId = $state<string>(loaded.activeProfileId);
  let showOnboarding = $state(checkNeedsOnboardingV3(loaded.profiles));

  let activeSessionQueue = $state<QueuedTaskV3[]>([]);

  let activeProfile = $derived(
    profiles.find((p) => p.id === activeProfileId) ?? profiles[0]
  );
  let gameMode = $derived<GameMode>(activeProfile.activeGameMode ?? 'mult');
  let facts = $derived<FactFamily[]>(
    gameMode === 'mult' ? activeProfile.multFacts : activeProfile.plusMinusFacts
  );
  let stats = $derived<UserStatsV3>(
    gameMode === 'mult' ? activeProfile.multStats : activeProfile.plusMinusStats
  );

  function persistAll(nextProfiles: UserProfileV3[], nextActiveId: string) {
    profiles = nextProfiles;
    activeProfileId = nextActiveId;
    saveV3ProfilesAndActiveId(nextProfiles, nextActiveId);
  }

  function updateActiveProfile(updater: (prof: UserProfileV3) => UserProfileV3) {
    const next = profiles.map((p) =>
      p.id === activeProfile.id ? updater(p) : p
    );
    persistAll(next, activeProfile.id);
  }

  function handleSwitchGameMode(nextMode: GameMode) {
    updateActiveProfile((prof) => ({
      ...prof,
      activeGameMode: nextMode,
    }));
  }

  function handleToggleSound() {
    const nextSound = !stats.soundEnabled;
    updateActiveProfile((prof) => ({
      ...prof,
      multStats: { ...prof.multStats, soundEnabled: nextSound },
      plusMinusStats: { ...prof.plusMinusStats, soundEnabled: nextSound },
    }));
    if (nextSound) playKeyTap(true);
  }

  function handleStartDailySession() {
    activeSessionQueue = buildDailySessionQueueV3(facts, stats.sessionSize);
    currentScreen = 'practice';
  }

  function handleStartWeakSpots() {
    activeSessionQueue = buildWeakSpotsSessionQueueV3(facts, stats.sessionSize);
    currentScreen = 'practice';
  }

  function handleStartBlitz() {
    currentScreen = 'blitz';
  }

  function handleRecordHighscore(newScore: number) {
    updateActiveProfile((prof) => {
      const mode = prof.activeGameMode ?? 'mult';
      if (mode === 'mult') {
        return {
          ...prof,
          multStats: {
            ...prof.multStats,
            blitzHighscore: Math.max(prof.multStats.blitzHighscore ?? 0, newScore),
          },
        };
      }
      return {
        ...prof,
        plusMinusStats: {
          ...prof.plusMinusStats,
          blitzHighscore: Math.max(prof.plusMinusStats.blitzHighscore ?? 0, newScore),
        },
      };
    });
  }

  function handleAddStars(additionalStars: number) {
    updateActiveProfile((prof) => {
      const mode = prof.activeGameMode ?? 'mult';
      if (mode === 'mult') {
        return {
          ...prof,
          multStats: {
            ...prof.multStats,
            stars: prof.multStats.stars + additionalStars,
          },
        };
      }
      return {
        ...prof,
        plusMinusStats: {
          ...prof.plusMinusStats,
          stars: prof.plusMinusStats.stars + additionalStars,
        },
      };
    });
  }

  function handleSaveStickers(
    unlockedStickers: string[],
    newStars: number,
    newBadge?: string,
    newAvatar?: string
  ) {
    updateActiveProfile((prof) => {
      const isMult = prof.activeGameMode === 'mult';
      const updatedMultStats = isMult
        ? { ...prof.multStats, stars: newStars }
        : prof.multStats;
      const updatedPmStats = !isMult
        ? { ...prof.plusMinusStats, stars: newStars }
        : prof.plusMinusStats;

      return {
        ...prof,
        avatar: newAvatar ?? prof.avatar,
        activeBadge: newBadge ?? prof.activeBadge,
        unlockedStickers,
        multStats: updatedMultStats,
        plusMinusStats: updatedPmStats,
      };
    });
  }

  function handleStartChapterSession(chapter: WorldChapterV3) {
    activeSessionQueue = buildChapterSessionQueueV3(chapter, stats.sessionSize);
    currentScreen = 'practice';
  }

  function handlePracticeFact(fact: FactFamily) {
    activeSessionQueue = [{ fact, variant: selectTaskVariant(fact) }];
    currentScreen = 'practice';
  }

  function handleFactEvaluated(
    updatedFact: FactFamily,
    starsEarned: number,
    isCorrect: boolean,
    isFast: boolean
  ) {
    updateActiveProfile((prof) => {
      const mode = prof.activeGameMode ?? 'mult';
      if (mode === 'mult') {
        const nextFacts = prof.multFacts.map((f) =>
          f.id === updatedFact.id ? updatedFact : f
        );
        const withStreak = registerDailyPracticeV3(prof.multStats);
        return {
          ...prof,
          multFacts: nextFacts,
          multStats: {
            ...withStreak,
            stars: withStreak.stars + starsEarned,
            totalSolved: isCorrect ? withStreak.totalSolved + 1 : withStreak.totalSolved,
            fastSolved: withStreak.fastSolved + (isFast ? 1 : 0),
          },
        };
      }

      // plusminus
      const nextFacts = prof.plusMinusFacts.map((f) =>
        f.id === updatedFact.id ? updatedFact : f
      );
      const withStreak = registerDailyPracticeV3(prof.plusMinusStats);
      return {
        ...prof,
        plusMinusFacts: nextFacts,
        plusMinusStats: {
          ...withStreak,
          stars: withStreak.stars + starsEarned,
          totalSolved: isCorrect ? withStreak.totalSolved + 1 : withStreak.totalSolved,
          fastSolved: withStreak.fastSolved + (isFast ? 1 : 0),
        },
      };
    });
  }

  function handleSelectProfile(id: string) {
    activeProfileId = id;
    saveV3ProfilesAndActiveId(profiles, id);
  }

  function handleCreateProfile(name: string, avatar: string, mode: GameMode = 'plusminus') {
    const fresh = createNewProfileV3(name, avatar, mode);
    persistAll([...profiles, fresh], fresh.id);
  }

  function handleCompleteOnboarding(name: string, avatar: string, mode: GameMode) {
    showOnboarding = false;
    try {
      window.localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
    } catch {}
    updateActiveProfile((prof) => ({
      ...prof,
      name,
      avatar,
      activeGameMode: mode,
    }));
  }

  function handleUpdateProfile(id: string, name: string, avatar: string) {
    const next = profiles.map((p) =>
      p.id === id ? { ...p, name: name.trim() || p.name, avatar } : p
    );
    persistAll(next, activeProfileId);
  }

  function handleDeleteProfile(id: string) {
    const remaining = profiles.filter((p) => p.id !== id);
    if (remaining.length === 0) {
      const fresh = createNewProfileV3('Spieler 1', '🐧');
      persistAll([fresh], fresh.id);
    } else {
      const nextActive = activeProfileId === id ? remaining[0].id : activeProfileId;
      persistAll(remaining, nextActive);
    }
  }

  function handleSwitchProfileGameMode(profileId: string, nextMode: GameMode) {
    const next = profiles.map((p) =>
      p.id === profileId ? { ...p, activeGameMode: nextMode } : p
    );
    persistAll(next, activeProfileId);
  }

  function handleRestoreProfile(restored: UserProfileV3) {
    const isSingleDefault =
      profiles.length === 1 &&
      profiles[0].name === 'Spieler 1' &&
      profiles[0].multStats.totalSolved === 0 &&
      profiles[0].plusMinusStats.totalSolved === 0;

    const base = isSingleDefault ? [] : profiles;
    if (!base.some((p) => p.id === restored.id)) {
      persistAll([...base, restored], restored.id);
    }
  }

  function handleImportSuccess(imported: UserProfileV3[]) {
    const keepActive = imported.some((p) => p.id === activeProfileId)
      ? activeProfileId
      : imported[imported.length - 1].id;
    persistAll(imported, keepActive);
  }
</script>

<main class="w-full min-h-dvh p-3 sm:p-5 flex flex-col justify-between">
  {#if currentScreen === 'home'}
    <HomeView
      {gameMode}
      {facts}
      {stats}
      {activeProfile}
      {profiles}
      soundEnabled={stats.soundEnabled}
      onSwitchGameMode={handleSwitchGameMode}
      onSelectProfile={handleSelectProfile}
      onToggleSound={handleToggleSound}
      onStartDailySession={handleStartDailySession}
      onStartWeakSpots={handleStartWeakSpots}
      onStartBlitz={handleStartBlitz}
      onStartChapterSession={handleStartChapterSession}
      onPracticeFact={handlePracticeFact}
      onOpenUsers={() => (currentScreen = 'users')}
      onOpenLegal={() => (currentScreen = 'legal')}
      onSaveStickers={handleSaveStickers}
    />
  {:else if currentScreen === 'practice'}
    <PracticeView
      initialQueue={activeSessionQueue}
      soundEnabled={stats.soundEnabled}
      onFactEvaluated={handleFactEvaluated}
      onFinishSession={() => (currentScreen = 'home')}
      onRestartSession={() => {
        handleStartDailySession();
      }}
    />
  {:else if currentScreen === 'blitz'}
    <BlitzChallengeView
      {facts}
      currentHighscore={stats.blitzHighscore ?? 0}
      soundEnabled={stats.soundEnabled}
      onRecordHighscore={handleRecordHighscore}
      onAddStars={handleAddStars}
      onBack={() => (currentScreen = 'home')}
    />
  {:else if currentScreen === 'legal'}
    <div class="w-full max-w-2xl mx-auto pb-8">
      <LegalView onBack={() => (currentScreen = 'home')} />
    </div>
  {/if}

  <!-- Benutzer- & Optionen-Modal -->
  {#if currentScreen === 'users'}
    <UserModal
      {profiles}
      activeProfileId={activeProfile.id}
      onSwitchProfileGameMode={handleSwitchProfileGameMode}
      onSelectProfile={handleSelectProfile}
      onCreateProfile={handleCreateProfile}
      onUpdateProfile={handleUpdateProfile}
      onDeleteProfile={handleDeleteProfile}
      onRestoreProfile={handleRestoreProfile}
      onImportSuccess={handleImportSuccess}
      onClose={() => (currentScreen = 'home')}
    />
  {/if}

  <!-- Willkommens-Onboarding bei Erst-Start / ungespieltem Profil -->
  {#if showOnboarding}
    <OnboardingModal
      initialName={activeProfile.name}
      initialAvatar={activeProfile.avatar}
      initialMode={activeProfile.activeGameMode ?? 'plusminus'}
      soundEnabled={stats.soundEnabled}
      onComplete={handleCompleteOnboarding}
    />
  {/if}
</main>
