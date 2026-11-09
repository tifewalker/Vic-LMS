import { About } from "@/components/marketing/About";
import { Hero } from "@/components/marketing/Hero";
import { ProgrammeTimeline } from "@/components/marketing/ProgrammeTimeline";

export default function LandingPage() {
  return (
    <main id="main" tabIndex={-1} className="outline-none">
      <Hero />
      <About />
      <ProgrammeTimeline />
    </main>
  );
}
