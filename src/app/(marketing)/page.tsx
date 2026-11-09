import { programme } from "@/content/landing";

export default function LandingPage() {
  // Sections are built after the plan is approved.
  return (
    <main id="main" className="container-site py-section">
      <h1 className="text-4xl">{programme.title}</h1>
    </main>
  );
}
