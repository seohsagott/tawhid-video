/**
 * The effects bed. Event times, cue mapping and gains come from
 * tools/resolve_sfx.py, which is a literal port of sfx3.py; the per-event
 * volume already includes sfx3's peak normalisation and dB gains.
 *
 * Only Kenney CC0 samples are used, with tonal ones excluded (v2 §3, §6).
 */
import React from "react";
import { Audio, Sequence, staticFile } from "remotion";
import { duckAt } from "../engine/duck";
import sfx from "../data/sfxEvents.json";

type Ev = { t: number; bank: string; file: string; cue: string; vol: number; dur: number };

export const SfxTrack: React.FC<{ fps: number; from?: number; to?: number }> = ({
  fps,
  from = 0,
  to = Infinity,
}) => {
  const events = (sfx.events as Ev[]).filter((e) => e.t + e.dur >= from && e.t < to);
  return (
    <>
      {events.map((e, i) => {
        const start = Math.round((e.t - from) * fps);
        const dur = Math.max(1, Math.ceil(e.dur * fps) + 1);
        return (
          <Sequence key={i} from={start} durationInFrames={dur} name={`sfx ${e.cue}`}>
            <Audio
              src={staticFile(`sfx/${e.bank}/${e.file}`)}
              volume={(f) => e.vol * duckAt(from + (start + f) / fps)}
            />
          </Sequence>
        );
      })}
    </>
  );
};
