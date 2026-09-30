/**
 * Shorts/Reels template demo (9:16): paper background, one large element in
 * the middle band, word-by-word captions in its lower third, top and bottom
 * bands kept clear for app UI (v2 §7). Content is a slice of the episode's
 * narration so the caption mechanics can be previewed; a real Short gets its
 * own script and project file.
 */
import React from "react";
import { AbsoluteFill, Audio, Img, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { z } from "zod";
import { zColor } from "@remotion/zod-types";
import { EL_KEYS } from "./schema/project";
import { FontGate } from "./components/FontGate";
import { WordCaptions } from "./components/WordCaptions";
import { wordsFor } from "./projects";
import { template } from "./templates";

export const ShortsDemoSchema = z.object({
  project: z.string(),
  fromSeconds: z.number(),
  seconds: z.number(),
  element: z.enum(EL_KEYS),
  captionColor: zColor(),
  activeColor: zColor(),
});
export type ShortsDemoProps = z.infer<typeof ShortsDemoSchema>;

export const ShortsDemo: React.FC<ShortsDemoProps> = ({ project, fromSeconds, seconds, element, captionColor, activeColor }) => {
  const { width, height, safe } = template("shorts-9x16");
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = fromSeconds + frame / fps;
  const words = React.useMemo(
    () => wordsFor(project).filter((w) => w[1] >= fromSeconds && w[2] <= fromSeconds + seconds),
    [project, fromSeconds, seconds],
  );
  const bandTop = height * safe.top;
  const bandH = height * (1 - safe.top - safe.bottom);
  return (
    <AbsoluteFill style={{ width, height, backgroundColor: "#E4DBD0", overflow: "hidden" }}>
      <Img src={staticFile("el/bg.png")} style={{ position: "absolute", width, height, objectFit: "cover" }} />
      <Img
        src={staticFile(`el/${element}.png`)}
        style={{ position: "absolute", left: width * 0.15, top: bandTop + bandH * 0.08, width: width * 0.7, height: bandH * 0.5, objectFit: "contain" }}
      />
      <FontGate>
        <WordCaptions
          words={words}
          t={t}
          width={width}
          height={height}
          yFrac={safe.top + (1 - safe.top - safe.bottom) * 0.82}
          size={72}
          color={captionColor}
          activeColor={activeColor}
        />
      </FontGate>
      <Audio src={staticFile("audio/ep0_voice_joined.flac")} startFrom={Math.round(fromSeconds * fps)} />
    </AbsoluteFill>
  );
};
