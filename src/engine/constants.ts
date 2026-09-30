/**
 * Ported from tawhid-kit/engine.py + render3.py.
 * Production standards v2 §6: 1920x1080, export 24 fps, animation grain 12 fps.
 */

export const W = 1920;
export const H = 1080;

/** Export frame rate (v2 §6). */
export const FPS = 24;
/** Stop-motion animation grain (v2 §6: "اثنا عشر إطارًا في الثانية"). */
export const FPS12 = 12;

// engine.py palette. v2 §6 fixes slate #5B6470 and rose #B9797A.
export const SLATE = "#5B6470";
export const ROSE = "#B9797A";
export const SAGE = "#60805A";
export const MUTED = "#8C827A";
export const GOLD = "#B9913F";

/** Card body fill — engine.card_sprites: (251,248,241). */
export const CARD_FILL = "rgb(251,248,241)";

export const FADE = 0.3; // render.py
export const APP = 0.5; // render.py — default element appear window
export const TR = 0.35; // render3.py transition length

// engine.py font families (registered in engine/fonts.ts).
export const F_MONT = "TawhidMontserrat";
export const F_AMIRI = "TawhidAmiri";
export const F_QURAN = "TawhidAmiriQuran";

/** engine.text_sprite defaults: letter-spacing 6% of size, line height 1.25. */
export const TXT_SPACING = 0.06;
export const TXT_LH = 1.25;

/** Montserrat named instances -> variable wght axis values. */
export const WEIGHT: Record<string, number> = {
  Thin: 100,
  ExtraLight: 200,
  Light: 300,
  Regular: 400,
  Medium: 500,
  SemiBold: 600,
  Bold: 700,
  ExtraBold: 800,
  Black: 900,
};

/** engine.isar — Arabic, Arabic Presentation Forms A and B. */
export const isar = (ch: string): boolean => {
  const c = ch.codePointAt(0);
  if (c === undefined) return false;
  return (
    (c >= 0x0600 && c <= 0x06ff) ||
    (c >= 0xfb50 && c <= 0xfdff) ||
    (c >= 0xfe70 && c <= 0xfeff)
  );
};
