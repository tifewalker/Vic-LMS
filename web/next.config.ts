import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static HTML export: Render serves web/out as a static site. All app pages are client-side and talk to /api.
  output: "export",
  // No image optimisation server on a static host; images are served as-is from public/.
  images: { unoptimized: true },
  // Every page exports as folder/index.html, so static hosts serve /admin/users/ without rewrites.
  trailingSlash: true,
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
