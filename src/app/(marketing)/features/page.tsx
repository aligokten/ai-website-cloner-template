import type { Metadata } from "next";
import { CtaBanner } from "@/components/marketing/cta";
import { FeaturesGrid } from "@/components/marketing/features-grid";
import { Formats } from "@/components/marketing/formats";
import { Pillars } from "@/components/marketing/pillars";
import { Section, SectionHeading } from "@/components/marketing/section";
import { Workflow } from "@/components/marketing/workflow";

export const metadata: Metadata = {
  title: "Features",
  description:
    "Text to 3D, image to 3D, AI texturing, remesh, auto-rigging and animation — every SAGG3D.ai feature, and the formats it exports to.",
};

export default function FeaturesPage() {
  return (
    <>
      <Section className="pt-16 pb-0">
        <SectionHeading
          eyebrow="Features"
          title="One workspace for the whole 3D pipeline"
          description="Generate the mesh, fix the topology, paint the materials, rig it, animate it and ship it — without leaving the browser."
        />
      </Section>
      <Pillars />
      <FeaturesGrid />
      <Workflow />
      <Formats />
      <CtaBanner />
    </>
  );
}
