import React from "react";
import { Composition } from "remotion";
import { Episode, FirstChapter, PreviewHalf } from "./Episode";
import { resolveProject } from "./engine/resolve";
import { ProjectSchema, type Project } from "./schema/project";
import { PROJECTS, wordsFor } from "./projects";
import { ShortsDemo, ShortsDemoSchema } from "./ShortsDemo";
import { template } from "./templates";

/**
 * Every composition is driven by its project file (public/projects/<id>/project.json).
 * The Zod schema puts the whole content in Studio's props panel; the duration
 * is computed from the resolved timeline, so editing an anchor moves the end.
 *
 * Studio's built-in Save can only write inline literals in this file — use the
 * "Save to project.json" button on the canvas instead.
 */
const durationOf = (p: Project, to?: number) => {
  const sc = resolveProject(p, wordsFor(p.id));
  const end = to === undefined ? sc.meta.end : to;
  return { end, firstChapterEnd: sc.shots[6].st, fps: p.fps };
};

export const RemotionRoot: React.FC = () => (
  <>
    {Object.values(PROJECTS).map((p) => (
      <React.Fragment key={p.id}>
        <Composition
          id={`${p.id}`}
          component={Episode}
          schema={ProjectSchema}
          defaultProps={p}
          fps={p.fps}
          width={p.width}
          height={p.height}
          durationInFrames={1}
          calculateMetadata={({ props }) => {
            const d = durationOf(props);
            return { durationInFrames: Math.round(d.end * props.fps), fps: props.fps, width: props.width, height: props.height };
          }}
        />
        <Composition
          id={`${p.id}-first-chapter`}
          component={FirstChapter}
          schema={ProjectSchema}
          defaultProps={p}
          fps={p.fps}
          width={p.width}
          height={p.height}
          durationInFrames={1}
          calculateMetadata={({ props }) => {
            const d = durationOf(props);
            return { durationInFrames: Math.round(d.firstChapterEnd * props.fps), fps: props.fps };
          }}
        />
        <Composition
          id={`${p.id}-preview-540p`}
          component={PreviewHalf}
          schema={ProjectSchema}
          defaultProps={p}
          fps={p.fps}
          width={p.width / 2}
          height={p.height / 2}
          durationInFrames={1}
          calculateMetadata={({ props }) => {
            const d = durationOf(props);
            return { durationInFrames: Math.round(d.end * props.fps), fps: props.fps, width: props.width / 2, height: props.height / 2 };
          }}
        />
      </React.Fragment>
    ))}
    <Composition
      id="template-shorts-9x16-demo"
      component={ShortsDemo}
      schema={ShortsDemoSchema}
      defaultProps={{ project: "tawhid-ep0", fromSeconds: 11.9, seconds: 11, element: "childlook", captionColor: "#5B6470", activeColor: "#B9797A" }}
      fps={template("shorts-9x16").fps}
      width={template("shorts-9x16").width}
      height={template("shorts-9x16").height}
      durationInFrames={Math.round(11 * template("shorts-9x16").fps)}
    />
  </>
);
