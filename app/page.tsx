import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { ProofSection } from "@/components/ProofSection";
import { NodeBuilder } from "@/components/NodeBuilder";

export default function HomePage() {
  return (
    <main>
      <Hero />
      <HowItWorks />
      <ProofSection />
      <NodeBuilder />
    </main>
  );
}
