/**
 * Note: When using the Node.JS APIs, the config file
 * doesn't apply. Instead, pass options directly to the APIs.
 *
 * All configuration options: https://remotion.dev/docs/config
 *
 * Production standards v2 §6: export 1080p at 24 fps.
 * Remotion is pinned to 4.0.429 — it is the last release whose macOS x64
 * compositor loads on macOS 12 (4.0.440+ needs a macOS 13 AVFoundation symbol).
 */

import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setCodec("h264");
