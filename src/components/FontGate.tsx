/**
 * Blocks rendering until the project fonts are in place.
 *
 * Text layout is measured with canvas metrics and memoised, so any component
 * that renders before the fonts resolve would bake fallback-font advances into
 * its positions and never recompute them — glyphs would paint in Montserrat
 * while the geometry came from the system sans. Nothing is rendered, and
 * therefore nothing is measured, until the faces are loaded.
 */
import React, { useEffect, useState } from "react";
import { continueRender, delayRender } from "remotion";
import { loadTawhidFonts } from "../engine/fonts";
import { resetMetricsCache } from "../engine/measure";

export const FontGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [ready, setReady] = useState(false);
  const [handle] = useState(() => delayRender("Tawhid fonts + text metrics"));

  useEffect(() => {
    let alive = true;
    loadTawhidFonts().then(() => {
      if (!alive) return;
      resetMetricsCache();
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Only released once the fonts-ready render has actually committed.
  useEffect(() => {
    if (ready) continueRender(handle);
  }, [ready, handle]);

  if (!ready) return null;
  return <>{children}</>;
};
