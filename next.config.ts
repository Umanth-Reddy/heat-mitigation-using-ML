import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  // This app is in a subdirectory; include parent workspace files for tracing.
  outputFileTracingRoot: path.join(process.cwd(), ".."),
  transpilePackages: [
    "@deck.gl/aggregation-layers",
    "@deck.gl/core",
    "@deck.gl/extensions",
    "@deck.gl/geo-layers",
    "@deck.gl/layers",
    "@deck.gl/mesh-layers",
    "@deck.gl/react",
    "@deck.gl/widgets",
    "@vis.gl/react-maplibre",
    "react-map-gl",
  ],
  webpack(config) {
    // maplibre-gl v6 uses `new URL(worker, import.meta.url)` for web workers.
    // This is incompatible with Turbopack but webpack handles it natively.
    config.module.rules.push({
      test: /maplibre-gl\.mjs$/,
      type: "javascript/auto",
    });
    return config;
  },
};

export default nextConfig;
