import { Hero } from "@/components/marketing/Hero";
import { About } from "@/components/marketing/About";
import { ProgrammeTimeline } from "@/components/marketing/ProgrammeTimeline";
import { ProgrammePictures } from "@/components/marketing/ProgrammePictures";
import { TrainingAreas } from "@/components/marketing/TrainingAreas";
import { Behind } from "@/components/marketing/Behind";
import { Faq } from "@/components/marketing/Faq";
import { FinalCta } from "@/components/marketing/FinalCta";

export default function LandingPage() {
  return (
    <main id="main" tabIndex={-1} className="outline-none">
      <Hero />
      <About />
      <ProgrammeTimeline />
      <ProgrammePictures />
      <TrainingAreas />
      <Behind />
      <Faq />
      <FinalCta />
    </main>
  );
}
