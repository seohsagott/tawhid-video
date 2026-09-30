/**
 * Studio-only "save to project file" control.
 *
 * Remotion's own Save button can only write the inline defaultProps literal
 * in src/Root.tsx — nowhere else. Our content lives in
 * public/projects/<id>/project.json, so this overlay writes the current props
 * there with writeStaticFile(). The file is also what Root imports, so the
 * write hot-reloads Studio and the panel and the file agree. Never rendered
 * outside Studio.
 */
import React, { useCallback, useState } from "react";
import { getRemotionEnvironment } from "remotion";
import { writeStaticFile } from "@remotion/studio";
import { ProjectSchema, type Project } from "../schema/project";

export const StudioSave: React.FC<{ project: Project }> = ({ project }) => {
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [msg, setMsg] = useState("");
  const save = useCallback(async () => {
    setState("saving");
    try {
      const clean = ProjectSchema.parse(project);
      await writeStaticFile({
        filePath: `projects/${clean.id}/project.json`,
        contents: JSON.stringify(clean, null, 1),
      });
      setState("saved");
      setMsg(`projects/${clean.id}/project.json`);
      setTimeout(() => setState("idle"), 2500);
    } catch (e) {
      setState("error");
      setMsg(e instanceof Error ? e.message : String(e));
    }
  }, [project]);

  if (!getRemotionEnvironment().isStudio) return null;
  const label = state === "saving" ? "Saving…" : state === "saved" ? "Saved ✓" : state === "error" ? "Error" : "Save to project.json";
  return (
    <div style={{ position: "absolute", right: 16, bottom: 16, zIndex: 9999, fontFamily: "system-ui, sans-serif" }}>
      <button
        type="button"
        onClick={save}
        style={{
          padding: "10px 16px", borderRadius: 8, border: 0, cursor: "pointer", fontSize: 18, fontWeight: 600,
          background: state === "error" ? "#b33" : state === "saved" ? "#2d7d46" : "#1f2937", color: "#fff",
          boxShadow: "0 4px 14px rgba(0,0,0,.35)",
        }}
      >
        {label}
      </button>
      {msg ? <div style={{ marginTop: 6, fontSize: 13, color: "#eee", textShadow: "0 1px 2px #000", textAlign: "right" }}>{msg}</div> : null}
    </div>
  );
};
