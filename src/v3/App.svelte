<script lang="ts">
  import { onMount } from 'svelte';
  import { playKeyTap } from './lib/audio';
  import {
    buildChapterSessionQueueV3,
    getScopedFactsV3,
    getWorldChaptersV3,
    type QueuedTaskV3,
    type WorldChapterV3,
  } from './lib/chapters';
  import { selectTaskVariant } from './lib/generator';
  import {
    buildDailySessionQueueV3,
    buildRowSessionQueueV3,
    buildWeakSpotsSessionQueueV3,
    checkNeedsOnboardingV3,
    createNewProfileV3,
    loadV3ProfilesAndActiveId,
    ONBOARDING_COMPLETED_KEY,
    registerDailyPracticeV3,
    saveV3ProfilesAndActiveId,
  } from './lib/storage';
  import type {
    FactFamily,
    GameMode,
    PracticeOperation,
    PracticeWorldScope,
    UserProfileV3,
    UserStatsV3,
  } from './lib/types';
  import HomeView from './components/HomeView.svelte';
  import PracticeView from './components/PracticeView.svelte';
  import BlitzChallengeView from './components/BlitzChallengeView.svelte';
  import UserModal from './components/UserModal.svelte';
  import OnboardingModal from './components/OnboardingModal.svelte';
  import LegalView from '../components/LegalView.svelte';

  type Screen = 'home' | 'practice' | 'users' | 'legal' | 'blitz';
  type LastSessionSpec =
    | { type: 'daily' }
    | { type: 'weakSpots' }
    | { type: 'chapter'; chapterId: string }
    | { type: 'row'; rowNumber: number }
    | { type: 'fact'; factId: string };

  let currentScreen = $state<Screen>('home');
  let loaded = loadV3ProfilesAndActiveId();
  let profiles = $state<UserProfileV3[]>(loaded.profiles);
  let activeProfileId = $state<string>(loaded.activeProfileId);
  let showOnboarding = $state(checkNeedsOnboardingV3(loaded.profiles));

  let activeSessionQueue = $state<QueuedTaskV3[]>([]);
  let sessionRunId = $state(0);
  let lastSessionSpec = $state<LastSessionSpec>({ type: 'daily' });
  let highlightStars = $state(false);

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
  let practiceOperation = $derived<PracticeOperation>(
    stats.practiceOperation ?? 'base'
  );
  let scopedPool = $derived(
    getScopedFactsV3(
      facts,
      gameMode,
      activeProfile.freeWorldChoice ?? false,
      stats.practiceWorldScope
    )
  );
  let effectiveWorldScope = $derived<PracticeWorldScope>(scopedPool.effectiveScope);
  let scopedFacts = $derived<FactFamily[]>(scopedPool.scopedFacts);
  let unlockedWorldCount = $derived<number>(scopedPool.unlockedWorldCount);

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
    highlightStars = false;
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

  function updateActiveModeStats(updater: (modeStats: UserStatsV3) => UserStatsV3) {
    updateActiveProfile((prof) => {
      const mode = prof.activeGameMode ?? 'mult';
      if (mode === 'mult') {
        return { ...prof, multStats: updater(prof.multStats) };
      }
      return { ...prof, plusMinusStats: updater(prof.plusMinusStats) };
    });
  }

  function handleSelectOperation(nextOp: PracticeOperation) {
    updateActiveModeStats((mStats) => ({
      ...mStats,
      practiceOperation: nextOp,
    }));
  }

  function handleSelectWorldScope(nextScope: PracticeWorldScope) {
    updateActiveModeStats((mStats) => ({
      ...mStats,
      practiceWorldScope: nextScope,
      acknowledgedUnlockedWorld:
        nextScope === 'all' || nextScope === unlockedWorldCount
          ? Math.max(mStats.acknowledgedUnlockedWorld ?? 1, unlockedWorldCount)
          : mStats.acknowledgedUnlockedWorld,
    }));
  }

  function handleAcknowledgeWorldUnlock(worldNumber: number) {
    updateActiveModeStats((mStats) => ({
      ...mStats,
      acknowledgedUnlockedWorld: Math.max(
        mStats.acknowledgedUnlockedWorld ?? 1,
        worldNumber
      ),
    }));
  }

  function startPracticeQueue(queue: QueuedTaskV3[], spec: LastSessionSpec) {
    activeSessionQueue = queue;
    lastSessionSpec = spec;
    sessionRunId += 1;
    currentScreen = 'practice';
  }

  function handleStartDailySession() {
    startPracticeQueue(
      buildDailySessionQueueV3(
        facts,
        stats.sessionSize,
        Date.now(),
        activeProfile.freeWorldChoice ?? false,
        practiceOperation,
        effectiveWorldScope
      ),
      { type: 'daily' }
    );
  }

  function handleStartWeakSpots() {
    startPracticeQueue(
      buildWeakSpotsSessionQueueV3(scopedFacts, stats.sessionSize, practiceOperation),
      { type: 'weakSpots' }
    );
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
    if (additionalStars > 0) {
      highlightStars = true;
    }
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
        activeBadge: newBadge,
        unlockedStickers,
        multStats: updatedMultStats,
        plusMinusStats: updatedPmStats,
      };
    });
  }

  function handleStartChapterSession(chapter: WorldChapterV3) {
    startPracticeQueue(
      buildChapterSessionQueueV3(chapter, stats.sessionSize, practiceOperation),
      { type: 'chapter', chapterId: chapter.id }
    );
  }

  function handleStartRowSession(rowNumber: number) {
    startPracticeQueue(
      buildRowSessionQueueV3(facts, rowNumber, stats.sessionSize, practiceOperation),
      { type: 'row', rowNumber }
    );
  }

  function handlePracticeFact(fact: FactFamily) {
    startPracticeQueue(
      [{ fact, variant: selectTaskVariant(fact, practiceOperation) }],
      { type: 'fact', factId: fact.id }
    );
  }

  function handleRestartPracticeSession() {
    switch (lastSessionSpec.type) {
      case 'weakSpots':
        handleStartWeakSpots();
        break;
      case 'chapter': {
        const chapterId = lastSessionSpec.chapterId;
        const chapter = getWorldChaptersV3(facts, gameMode).find(
          (c) => c.id === chapterId
        );
        if (chapter) handleStartChapterSession(chapter);
        else handleStartDailySession();
        break;
      }
      case 'row':
        handleStartRowSession(lastSessionSpec.rowNumber);
        break;
      case 'fact': {
        const factId = lastSessionSpec.factId;
        const fact = facts.find((f) => f.id === factId);
        if (fact) handlePracticeFact(fact);
        else handleStartDailySession();
        break;
      }
      case 'daily':
      default:
        handleStartDailySession();
        break;
    }
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
    highlightStars = false;
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
      defaultAvatar: avatar,
      activeBadge: undefined,
      activeGameMode: mode,
    }));
  }

  function handleUpdateProfile(id: string, name: string, avatar: string) {
    const next = profiles.map((p) =>
      p.id === id
        ? {
            ...p,
            name: name.trim() || p.name,
            avatar,
            defaultAvatar: avatar,
            activeBadge: undefined,
          }
        : p
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

  function handleToggleFreeWorldChoice(profileId: string, freeChoice: boolean) {
    const next = profiles.map((p) => {
      if (p.id !== profileId) return p;
      const nextMultScope: PracticeWorldScope | undefined = freeChoice
        ? 'all'
        : p.multStats.practiceWorldScope === 'all'
          ? 1
          : p.multStats.practiceWorldScope;
      const nextPmScope: PracticeWorldScope | undefined = freeChoice
        ? 'all'
        : p.plusMinusStats.practiceWorldScope === 'all'
          ? 1
          : p.plusMinusStats.practiceWorldScope;
      return {
        ...p,
        freeWorldChoice: freeChoice,
        multStats: { ...p.multStats, practiceWorldScope: nextMultScope },
        plusMinusStats: { ...p.plusMinusStats, practiceWorldScope: nextPmScope },
      };
    });
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
      {scopedFacts}
      {stats}
      {activeProfile}
      {profiles}
      soundEnabled={stats.soundEnabled}
      {highlightStars}
      {practiceOperation}
      {effectiveWorldScope}
      {unlockedWorldCount}
      onAcknowledgeStars={() => (highlightStars = false)}
      onSwitchGameMode={handleSwitchGameMode}
      onSelectOperation={handleSelectOperation}
      onSelectWorldScope={handleSelectWorldScope}
      onAcknowledgeWorldUnlock={handleAcknowledgeWorldUnlock}
      onSelectProfile={handleSelectProfile}
      onToggleSound={handleToggleSound}
      onStartDailySession={handleStartDailySession}
      onStartWeakSpots={handleStartWeakSpots}
      onStartBlitz={handleStartBlitz}
      onStartChapterSession={handleStartChapterSession}
      onStartRowSession={handleStartRowSession}
      onPracticeFact={handlePracticeFact}
      onOpenUsers={() => (currentScreen = 'users')}
      onOpenLegal={() => (currentScreen = 'legal')}
      onSaveStickers={handleSaveStickers}
    />
  {:else if currentScreen === 'practice'}
    {#key sessionRunId}
      <PracticeView
        initialQueue={activeSessionQueue}
        soundEnabled={stats.soundEnabled}
        onFactEvaluated={handleFactEvaluated}
        onFinishSession={(completed) => {
          if (completed) {
            highlightStars = true;
          }
          currentScreen = 'home';
        }}
        onRestartSession={handleRestartPracticeSession}
      />
    {/key}
  {:else if currentScreen === 'blitz'}
    <BlitzChallengeView
      {facts}
      currentHighscore={stats.blitzHighscore ?? 0}
      soundEnabled={stats.soundEnabled}
      freeWorldChoice={activeProfile.freeWorldChoice ?? false}
      {practiceOperation}
      practiceWorldScope={effectiveWorldScope}
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
      onToggleFreeWorldChoice={handleToggleFreeWorldChoice}
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
      initialName={activeProfile.name === 'Spieler 1' ? '' : activeProfile.name}
      initialAvatar={activeProfile.avatar}
      initialMode={activeProfile.activeGameMode ?? 'plusminus'}
      soundEnabled={stats.soundEnabled}
      onComplete={handleCompleteOnboarding}
    />
  {/if}
</main>
