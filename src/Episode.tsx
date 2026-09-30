/**
 * The episode composition.
 *
 * Timebase: the export runs at 24 fps (v2 §6) but the animation is stepped on
 * twos so it reads as twelve frames a second — the stop-motion character the
 * standards ask for. `n12` is therefore floor(absoluteFrame / 2) and the time
 * handed to every ported function is n12 / 12, which is exactly the `t` that
 * render3.frame3(n) used.
 */
import React from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { FPS12, H, W } from "./engine/constants";
import type { Scenes } from "./engine/types";
import { FontGate } from "./components/FontGate";
import { Frame } from "./components/Shot";
import { SfxTrack } from "./components/Sfx";
import scenesData from "./data/scenes.json";

const scenes = scenesData as unknown as Scenes;

export type EpisodeProps = {
  /** episode time, in seconds, that this composition starts at */
  from: number;
  /** episode time, in seconds, that it ends at */
  to: number;
};

export const Episode: React.FC<EpisodeProps> = ({ from, to }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const absFrame = Math.round(from * fps) + frame;
  const n12 = Math.floor(absFrame / 2);
  const t = n12 / FPS12;

  const shots = scenes.shots.filter((s) => s.en > from - 1 && s.st < to + 1);

  return (
    <AbsoluteFill style={{ width: W, height: H, backgroundColor: "#E4DBD0", overflow: "hidden" }}>
      <FontGate>
        <Frame shots={shots} t={t} n12={n12} />
      </FontGate>
      <Audio
        src={staticFile("audio/ep0_voice_joined.flac")}
        startFrom={Math.round(from * fps)}
      />
      <SfxTrack fps={fps} from={from} to={to} />
    </AbsoluteFill>
  );
};
