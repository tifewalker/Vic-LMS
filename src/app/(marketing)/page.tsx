import { About } from "@/components/marketing/About";
import { Hero } from "@/components/marketing/Hero";

export default function LandingPage() {
  return (
    <main id="main" tabIndex={-1} className="outline-none">
      <Hero />
      <About />
    </main>
  );
}
