/** Template geometry (templates/templates.json) as typed constants. */
import templates from "../../templates/templates.json";

export type TemplateId = keyof typeof templates;
export type Template = (typeof templates)["youtube-16x9"];
export const TEMPLATES = templates;

export const template = (id: string): Template => {
  const t = (templates as unknown as Record<string, Template>)[id];
  if (!t) throw new Error(`unknown template ${id}`);
  return t;
};
