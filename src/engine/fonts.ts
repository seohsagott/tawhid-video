/**
 * Font registration. The native FontFace API is used rather than a helper so the
 * Montserrat variable weight axis (100-900) is declared explicitly: the file's
 * default instance is Thin, so every weight must be set on purpose.
 *
 * engine.py uses Amiri-Regular for Arabic inside mixed text and for `kind='a'`,
 * and AmiriQuran for the 'uthmani verse text (`kind='q'`).
 */
import { continueRender, delayRender, staticFile } from "remotion";
import { F_AMIRI, F_MONT, F_QURAN } from "./constants";

const FACES: { family: string; file: string; weight: string }[] = [
  { family: F_MONT, file: "fonts/Montserrat.ttf", weight: "100 900" },
  { family: F_AMIRI, file: "fonts/Amiri-Regular.ttf", weight: "400" },
  { family: F_AMIRI, file: "fonts/Amiri-Bold.ttf", weight: "700" },
  { family: F_QURAN, file: "fonts/AmiriQuran-Regular.ttf", weight: "400" },
];

let started: Promise<void> | null = null;

export const loadTawhidFonts = (): Promise<void> => {
  if (started) return started;
  const handle = delayRender("Loading Tawhid fonts");
  started = (async () => {
    await Promise.all(
      FACES.map(async (f) => {
        const face = new FontFace(f.family, `url(${staticFile(f.file)})`, {
          weight: f.weight,
          style: "normal",
        });
        await face.load();
        document.fonts.add(face);
      }),
    );
    await document.fonts.ready;
  })();
  started.then(
    () => continueRender(handle),
    (err) => {
      continueRender(handle);
      throw err;
    },
  );
  return started;
};
