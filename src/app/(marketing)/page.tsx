import { CtaBanner } from "@/components/marketing/cta";
import { FaqList } from "@/components/marketing/faq";
import { FeaturesGrid } from "@/components/marketing/features-grid";
import { Formats } from "@/components/marketing/formats";
import { Hero } from "@/components/marketing/hero";
import { LogoMarquee } from "@/components/marketing/logo-marquee";
import { Pillars } from "@/components/marketing/pillars";
import { PricingTable } from "@/components/marketing/pricing-table";
import { Section, SectionHeading } from "@/components/marketing/section";
import { ShowcaseStrip } from "@/components/marketing/showcase-strip";
import { Testimonials } from "@/components/marketing/testimonials";
import { Workflow } from "@/components/marketing/workflow";

export default function HomePage() {
  return (
    <>
      <Hero />
      <LogoMarquee />
      <Pillars />
      <FeaturesGrid />
      <Workflow />
      <ShowcaseStrip />
      <Formats />
      <Testimonials />

      <Section id="pricing" className="border-t border-border">
        <SectionHeading
          eyebrow="Pricing"
          title="Start free, scale when you ship"
          description="Credits roll with your plan. Cancel or switch at any time."
        />
        <div className="mt-12">
          <PricingTable compact />
        </div>
      </Section>

      <Section id="story" className="border-t border-border bg-surface/25">
        <SectionHeading eyebrow="FAQ" title="Questions, answered" />
        <FaqList />
      </Section>

      <CtaBanner />
    </>
  );
}
