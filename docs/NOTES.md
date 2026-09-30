# Project notes

## Editor options considered (2026-09-30)

**designcombo/react-video-editor** — a CapCut-style browser editor.

- Its current `main` was migrated to the OpenVideo engine (PixiJS + WebCodecs,
  commit `9a8c529`, 2026-06-30). Rejected for this studio: export runs in the
  browser (a 4 GB machine), it expects Cloudflare R2 storage and a paid
  Deepgram key, its audio library includes music, and it does not connect to
  our engine or the cloud export.
- **Kept for the future: the last Remotion-based version, commit `4d0885a`
  (2026-03-05).** It used `remotion ^4.0.315`, `@remotion/player`,
  `@remotion/transitions`, and the `@designcombo/*` packages
  (`state`, `timeline`, `animations`, `transitions`, `frames`, `events` at
  5.5.8 — still published on npm). Same two-tier licence as Remotion: free for
  an individual or a company of up to three. If a visual timeline editor is
  ever wanted on top of this engine, that commit is the starting point, not the
  current `main`. Not installed.

## Machine limits

macOS 12.7.6, Intel, 4 GB. Remotion is pinned to 4.0.429 (last compositor that
loads here); final export always runs in GitHub Actions. FFmpeg 9 static build
in `~/.local/bin` for local audio work.
