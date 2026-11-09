import { Hero } from "@/components/marketing/Hero";
import { About } from "@/components/marketing/About";
import { ProgrammeTimeline } from "@/components/marketing/ProgrammeTimeline";
import { TrainingAreas } from "@/components/marketing/TrainingAreas";
import { Participation } from "@/components/marketing/Participation";

export default function LandingPage() {
  return (
    <main id="main" tabIndex={-1} className="outline-none">
      <Hero />
      <About />
      <ProgrammeTimeline />
      <TrainingAreas />
      <Participation />
    </main>
  );
}
