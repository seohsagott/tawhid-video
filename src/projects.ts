/**
 * Project registry. A project is a content file under public/projects/<id>/
 * plus its word timings. The JSON is imported (not fetched) so an edit to the
 * file on disk hot-reloads Studio, and it is also served from public/ so the
 * Studio save overlay can write it back with writeStaticFile().
 */
import type { Project } from "./schema/project";
import type { Words } from "./engine/locate";
import tawhidEp0 from "../public/projects/tawhid-ep0/project.json";
import tawhidEp0Words from "../public/projects/tawhid-ep0/words.json";

export const PROJECTS: Record<string, Project> = {
  "tawhid-ep0": tawhidEp0 as unknown as Project,
};

export const WORDS: Record<string, Words> = {
  "tawhid-ep0": tawhidEp0Words as unknown as Words,
};

export const wordsFor = (id: string): Words => {
  const w = WORDS[id];
  if (!w) throw new Error(`no word timings registered for project "${id}"`);
  return w;
};
