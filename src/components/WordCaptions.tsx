/**
 * Word-by-word captions for the vertical formats (v2 §7: "ترجمة مكتوبة كبيرة
 * كلمة بكلمة في الثلث السفلي من الشريط الأوسط"). Groups the word timings into
 * short lines and lights the word being spoken. Uses the brand fonts; no
 * external assets.
 */
import React from "react";
import type { Words } from "../engine/locate";
import { F_MONT, WEIGHT } from "../engine/constants";

export type WordCaptionsProps = {
  words: Words;
  t: number;
  /** vertical centre of the caption block, as a fraction of the frame height */
  yFrac?: number;
  width: number;
  height: number;
  size?: number;
  color?: string;
  activeColor?: string;
  maxWordsPerLine?: number;
  /** break a line when the pause between words exceeds this many seconds */
  breakGap?: number;
};

type Line = { words: Words; from: number; to: number };

export const groupLines = (words: Words, maxWords: number, breakGap: number): Line[] => {
  const lines: Line[] = [];
  let cur: Words = [];
  const flush = () => {
    if (cur.length) lines.push({ words: cur, from: cur[0][1], to: cur[cur.length - 1][2] });
    cur = [];
  };
  words.forEach((w, i) => {
    const prev = words[i - 1];
    const endsSentence = prev && /[.?!]$/.test(prev[0]);
    if (cur.length && (cur.length >= maxWords || endsSentence || w[1] - prev[2] > breakGap)) flush();
    cur.push(w);
  });
  flush();
  return lines;
};

export const WordCaptions: React.FC<WordCaptionsProps> = ({
  words, t, yFrac = 0.72, width, height, size = 64, color = "#5B6470", activeColor = "#B9797A",
  maxWordsPerLine = 5, breakGap = 0.8,
}) => {
  const lines = React.useMemo(() => groupLines(words, maxWordsPerLine, breakGap), [words, maxWordsPerLine, breakGap]);
  const line = lines.find((l) => t >= l.from - 0.1 && t < l.to + 0.35);
  if (!line) return null;
  return (
    <div
      style={{
        position: "absolute", left: 0, width, top: height * yFrac - size, textAlign: "center",
        fontFamily: F_MONT, fontWeight: WEIGHT.Bold, fontSize: size, lineHeight: 1.25, letterSpacing: size * 0.04,
        textTransform: "uppercase", padding: `0 ${width * 0.08}px`, boxSizing: "border-box",
      }}
    >
      {line.words.map((w, i) => {
        const on = t >= w[1] - 0.05 && t < (line.words[i + 1]?.[1] ?? w[2] + 0.5);
        return (
          <span key={i} style={{ color: on ? activeColor : color }}>
            {w[0].replace(/[.,;:!?]$/, "")}{" "}
          </span>
        );
      })}
    </div>
  );
};
