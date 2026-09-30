import React from "react";
import { Composition } from "remotion";
import { Episode } from "./Episode";
import { FPS, H, W } from "./engine/constants";
import type { Scenes } from "./engine/types";
import scenesData from "./data/scenes.json";

const scenes = scenesData as unknown as Scenes;

/**
 * The first chapter of the introduction episode: 0:00 -> 1:03 in chapters.txt
 * ("Why did Allah create us?"), which is shots 0-5. It runs to the shot
 * boundary rather than being cut at a flat sixty seconds, so it ends on a
 * complete idea (v3 §12).
 */
const MINUTE1_TO = scenes.shots[6].st;

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Minute1"
        component={Episode}
        durationInFrames={Math.round(MINUTE1_TO * FPS)}
        fps={FPS}
        width={W}
        height={H}
        defaultProps={{ from: 0, to: MINUTE1_TO }}
      />
      <Composition
        id="Episode0-Full"
        component={Episode}
        durationInFrames={Math.round(scenes.meta.end * FPS)}
        fps={FPS}
        width={W}
        height={H}
        defaultProps={{ from: 0, to: scenes.meta.end }}
      />
    </>
  );
};
