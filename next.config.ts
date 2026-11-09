import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static HTML export: Render serves the out/ folder as a static site.
  output: "export",
  // No image optimisation server on a static host; images are served as-is from public/.
  images: { unoptimized: true },
  experimental: {
    // Landing page: inline the small Tailwind stylesheet so it does not block first paint.
    inlineCss: true,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
