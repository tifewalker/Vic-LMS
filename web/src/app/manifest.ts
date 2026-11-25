import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

// Lets students add the platform to their home screen. On iPhones this is required before
// class reminders (push notifications) can be turned on.
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: site.shortName,
    short_name: "OAUSTECH Training",
    description: "Classes, timetable and reminders for the OAUSTECH training programme.",
    start_url: "/login/",
    scope: "/",
    display: "standalone",
    background_color: "#f5f1e8",
    theme_color: "#f5f1e8",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
