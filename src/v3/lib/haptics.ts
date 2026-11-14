/**
 * Haptisches Feedback (Vibration) für ZahlenBlitz.
 * Funktioniert nativ im mobilen Web via navigator.vibrate()
 * und ist kompatibel mit Capacitor Haptics.
 */

let hapticsEnabled = true;

export function setHapticsEnabled(enabled: boolean) {
  hapticsEnabled = enabled;
}

export function isHapticsSupported(): boolean {
  return typeof window !== 'undefined' && typeof navigator !== 'undefined' && 'vibrate' in navigator;
}

function vibrate(pattern: number | number[]) {
  if (!hapticsEnabled || !isHapticsSupported()) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    // Stillschweigend ignorieren, falls vom System geblockt
  }
}

/** Zartes, kurzes Tastatur-Klicken beim Tippen auf das Nummernfeld */
export function hapticTap() {
  vibrate(8);
}

/** Sanftes, positives Doppel-Feedback bei richtiger Antwort */
export function hapticSuccess() {
  vibrate([12, 35, 18]);
}

/** Spürbares, sanft bremsendes Feedback bei falscher Antwort */
export function hapticError() {
  vibrate([35, 45, 35]);
}

/** Feierliches Pulsieren bei abgeschlossener Mission oder Highscore */
export function hapticCelebration() {
  vibrate([25, 40, 30, 40, 50]);
}
