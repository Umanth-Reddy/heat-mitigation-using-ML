import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
