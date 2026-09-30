/**
 * The effects bed. Cues come from resolveSfx() — a literal port of sfx3.py —
 * with sfx3's peak normalisation and dB gains folded into each cue's volume,
 * then ducked under the narration (v2 §6). Only Kenney CC0 samples, tonal
 * ones excluded (v2 §3, §6).
 */
import React from "react";
import { Audio, Sequence, staticFile } from "remotion";
import type { SfxEvent } from "../engine/resolve";

export const SfxTrack: React.FC<{ events: SfxEvent[]; duck: (t: number) => number; fps: number; from?: number; to?: number }> = ({
  events,
  duck,
  fps,
  from = 0,
  to = Infinity,
}) => (
  <>
    {events
      .filter((e) => e.t + e.dur >= from && e.t < to)
      .map((e, i) => {
        const start = Math.round((e.t - from) * fps);
        const dur = Math.max(1, Math.ceil(e.dur * fps) + 1);
        return (
          <Sequence key={i} from={start} durationInFrames={dur} name={`sfx ${e.cue}`}>
            <Audio src={staticFile(`sfx/${e.bank}/${e.file}`)} volume={(f) => e.vol * duck(from + (start + f) / fps)} />
          </Sequence>
        );
      })}
  </>
);
