#!/usr/bin/env bash
# Which Remotion compositor builds actually run on this macOS?
# Usage: tools/probe-macos12.sh [versions...]
set -u
cd "$(mktemp -d)" || exit 1
for v in "${@:-4.0.140 4.0.240 4.0.250 4.0.290 4.0.429 4.0.440}"; do
  rm -rf t && mkdir t && cd t || exit 1
  if npm pack "@remotion/compositor-darwin-x64@$v" --silent >/dev/null 2>&1; then
    tar xzf ./*.tgz 2>/dev/null
    chmod +x package/ffprobe package/remotion 2>/dev/null
    p=$(cd package && DYLD_LIBRARY_PATH="$PWD" ./ffprobe -version 2>&1 | head -1)
    c=$(cd package && DYLD_LIBRARY_PATH="$PWD" ./remotion 2>&1 | head -1)
    case "$p" in *"ffprobe version"*) a="ffprobe OK     ";; *) a="ffprobe BROKEN ";; esac
    case "$c" in *"Symbol not found"*|*"Library not loaded"*) b="compositor BROKEN";; *) b="compositor OK";; esac
    printf "%-9s %s %s\n" "$v" "$a" "$b"
  else
    printf "%-9s (not published)\n" "$v"
  fi
  cd ..
done
