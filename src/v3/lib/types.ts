export type GameMode = 'mult' | 'plusminus';

export type PracticeOperation = 'base' | 'inverse' | 'mix' | 'gap';
export type PracticeWorldScope = 1 | 2 | 3 | 'all';

export type MultVariant =
  | 'mult'        // a × b = ?
  | 'div'         // c : b = ?
  | 'gap_mult_b'  // a × ? = c (Zahl × ? = Zahl)
  | 'gap_div_a'   // c : ? = a (Zahl : ? = Zahl)
  | 'gap_mult_a'  // (legacy) ? × b = c
  | 'gap_div_c';  // (legacy) ? : b = a

export type PlusMinusVariant =
  | 'add'         // a + b = ?
  | 'sub'         // c - b = ?
  | 'gap_add_b'   // a + ? = c (Zahl + ? = Zahl)
  | 'gap_sub_b'   // c - ? = a (Zahl - ? = Zahl)
  | 'gap_add_a'   // (legacy) ? + b = c
  | 'gap_sub_c';  // (legacy) ? - b = a

export type TaskVariant = MultVariant | PlusMinusVariant;

export type DidacticStrategyPM =
  | 'up_to_10'      // Zerlegungen bis 10 (z.B. 3+1, 5+2, 6+3)
  | 'bonds_10'      // Verliebte Zahlen / Partner zur 10 (c === 10)
  | 'doubles'       // Verdopplungsaufgaben (a === b)
  | 'near_doubles'  // Nachbaraufgaben / Fast-Verdoppeln (|a - b| === 1)
  | 'ten_plus'      // Zehner-Bündel (10 + x / x + 10)
  | 'over_10';      // Zehnerübergang (c > 10, Zehnerstopp)

export type DidacticStrategyMult =
  | 'core_1_10'     // 1er und 10er Reihe (elementare Kernaufgaben)
  | 'core_2_5'      // 2er und 5er Reihe (Verdoppeln & Fünfersprünge)
  | 'squares'       // Quadratzahlen (a === b)
  | 'near_squares'  // Nachbarn der Quadratzahlen (|a - b| === 1)
  | 'kings';        // Schwere Königsaufgaben (3, 4, 6, 7, 8, 9)

export type MasteryStatus = 'new' | 'wrong' | 'learning' | 'mastered';

export type MasteryColorLevel =
  | 'fresh'        // Weiß / Grau (Noch unberührt)
  | 'wrong_soft'   // Rosa / Zartrot (Einmaliger Fehler / Vertipper)
  | 'wrong_hard'   // Dunkelrot (Echter Wackelkandidat)
  | 'learning'     // Gelb (1x richtig, noch am Anfang)
  | 'green_step1'  // Hellgrün (Stufe 1: Grundaufgabe sitzt sicher)
  | 'green_step2'  // Mittelgrün (Stufe 2: Umkehraufgabe gemeistert)
  | 'green_step3'; // Dunkelgrün (Stufe 3: Lückenaufgabe gemeistert)

export interface FactVisualStatus {
  level: MasteryColorLevel;
  hasCrown: boolean;
  label: string;
  badge: string;
  shortDesc: string;
}

export interface FactFamily {
  id: string;                     // z.B. "pm_3_4" oder "mult_7_8"
  mode: GameMode;
  a: number;                      // 1..10
  b: number;                      // 1..10
  c: number;                      // a + b bzw. a * b
  strategy: DidacticStrategyPM | DidacticStrategyMult;

  // --- Spaced Repetition (SM-2) auf Faktenebene ---
  repetitions: number;            // 0 = unberührt, 1 = 1x richtig, >=2 = gefestigt
  easeFactor: number;             // Standard: 2.5 (Min: 1.3, Max: 3.2)
  interval: number;               // in Tagen
  dueDate: number;                // Timestamp (ms)
  lastQuality?: 0 | 2 | 3 | 4;   // 0=Fehler, 2=langsam/gerechnet, 3=gut, 4=automatisiert
  lastResponseMs?: number;
  totalAttempts: number;
  correctAttempts: number;

  // Welche Transferformen (Umkehrung, Lücken) wurden bereits erfolgreich gemeistert?
  masteredVariants: TaskVariant[];
}

export interface UserStatsV3 {
  stars: number;
  streakDays: number;
  lastPracticeDate: string | null; // "YYYY-MM-DD"
  totalSolved: number;
  fastSolved: number;
  soundEnabled: boolean;
  sessionSize: number;                      // Standard: 10 (kindgerechte Rundenlänge)
  blitzHighscore?: number;                  // Bester 60s-Blitz-Score
  practiceOperation?: PracticeOperation;    // Standard: 'base' (➕ Plus / ✖️ Mal)
  practiceWorldScope?: PracticeWorldScope;  // Standard: 1 (bzw. 'all' bei freeWorldChoice)
  acknowledgedUnlockedWorld?: number;       // Höchste bereits gefeierte/bestätigte freigeschaltete Welt (1..3)
}

export interface UserProfileV3 {
  id: string;
  name: string;
  avatar: string;
  defaultAvatar?: string;         // Standard-Profilbild (beim Anlegen oder in den Einstellungen gewählt)
  activeGameMode: GameMode;
  freeWorldChoice?: boolean;
  createdAt: number;
  multStats: UserStatsV3;
  multFacts: FactFamily[];        // Exakt 100 Fakten
  plusMinusStats: UserStatsV3;
  plusMinusFacts: FactFamily[];   // Exakt 100 Fakten
  unlockedStickers?: string[];    // IDs der freigeschalteten Sammel-Sticker
  activeBadge?: string;           // Optionaler Lieblings-Sticker als Abzeichen
}

export interface EquationPartsV3 {
  left: string;
  right: string;
  solution: number;
  prompt: string;
  variant: TaskVariant;
  typeBadge: string;
  fullEquationWithSolution: string;
  strategyHint: string;
  hintText?: string;
}

export type ImportPromptStatus = 'pending' | 'done' | 'never';
