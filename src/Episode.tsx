/**
 * The episode composition, driven by a project file.
 *
 * Timebase: export runs at project fps (24, v2 §6) but the animation is
 * stepped on twos so it reads as twelve frames a second. `n12` is
 * floor(absoluteFrame / 2) and the time handed to every ported function is
 * n12 / 12 — exactly the `t` that render3.frame3(n) used.
 */
import React, { useMemo } from "react";
import { AbsoluteFill, Audio, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { FPS12 } from "./engine/constants";
import { makeDucker } from "./engine/duck";
import { resolveProject, resolveSfx } from "./engine/resolve";
import type { Project } from "./schema/project";
import { wordsFor } from "./projects";
import { FontGate } from "./components/FontGate";
import { Frame } from "./components/Shot";
import { SfxTrack } from "./components/Sfx";
import { StudioSave } from "./components/StudioSave";
import { WordCaptions } from "./components/WordCaptions";

export type EpisodeProps = Project & {
  /** optional end, in episode seconds (used by the first-chapter composition) */
  to?: number;
};

export const Episode: React.FC<EpisodeProps> = (props) => {
  const { to, ...project } = props;
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const words = wordsFor(project.id);
  const scenes = useMemo(() => resolveProject(project, words), [project, words]);
  const sfx = useMemo(() => resolveSfx(scenes), [scenes]);
  const duck = useMemo(() => makeDucker(words), [words]);

  const end = to ?? scenes.meta.end;
  const n12 = Math.floor(frame / 2);
  const t = n12 / FPS12;
  const shots = scenes.shots.filter((s) => s.st < end + 1);

  const { width: W, height: H } = project;
  const cap = project.captions;
  return (
    <AbsoluteFill style={{ width: W, height: H, backgroundColor: "#E4DBD0", overflow: "hidden" }}>
      <FontGate>
        <Frame shots={shots} t={t} n12={n12} w={W} h={H} />
        {cap?.enabled ? (
          <WordCaptions words={words} t={t} width={W} height={H} yFrac={cap.yFrac} size={cap.size} color={cap.color} activeColor={cap.activeColor} />
        ) : null}
      </FontGate>
      <Audio src={staticFile(project.audio)} />
      <SfxTrack events={sfx} duck={duck} fps={fps} from={0} to={end} />
      <StudioSave project={project} />
    </AbsoluteFill>
  );
};

/** First chapter only (shots 0-5, "Why did Allah create us?") — ends on the shot boundary. */
export const FirstChapter: React.FC<Project> = (project) => {
  const scenes = useMemo(() => resolveProject(project, wordsFor(project.id)), [project]);
  return <Episode {...project} to={scenes.shots[6].st} />;
};

/**
 * Half-resolution preview for a weak machine: the same composition drawn into
 * a 960x540 canvas. Everything scales through one CSS transform, so images are
 * painted at a quarter of the pixels. Never used for export.
 */
export const PreviewHalf: React.FC<Project> = (project) => (
  <AbsoluteFill style={{ width: project.width / 2, height: project.height / 2, overflow: "hidden" }}>
    <div style={{ width: project.width, height: project.height, transform: "scale(0.5)", transformOrigin: "top left", position: "absolute" }}>
      <Episode {...project} />
    </div>
  </AbsoluteFill>
);
