import type { Metadata } from "next";
import { CtaBanner } from "@/components/marketing/cta";
import { FaqList } from "@/components/marketing/faq";
import { PricingTable } from "@/components/marketing/pricing-table";
import { Section, SectionHeading } from "@/components/marketing/section";
import { CREDIT_COST } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "SAGG3D.ai pricing — Free, Pro, Studio and Enterprise plans with monthly credits for text to 3D, image to 3D, texturing, remesh and animation.",
};

const COST_LABELS: Record<keyof typeof CREDIT_COST, string> = {
  "text-to-3d": "Text to 3D",
  "image-to-3d": "Image to 3D",
  texture: "AI texturing",
  remesh: "Remesh",
  animate: "Animate",
};

export default function PricingPage() {
  return (
    <>
      <Section className="pt-16">
        <SectionHeading
          eyebrow="Pricing"
          title="Plans that scale with your pipeline"
          description="Every plan includes the full toolset. Paid plans add private assets, higher concurrency and API access."
        />
        <div className="mt-12">
          <PricingTable />
        </div>
      </Section>

      <Section className="border-t border-border bg-surface/25">
        <SectionHeading
          eyebrow="Credits"
          title="What each action costs"
          description="Credits are only spent when a job succeeds. Failed jobs are refunded automatically."
        />
        <div className="mx-auto mt-12 max-w-2xl divide-y divide-border overflow-hidden rounded-2xl border border-border bg-surface">
          {(Object.keys(CREDIT_COST) as Array<keyof typeof CREDIT_COST>).map((mode) => (
            <div key={mode} className="flex items-center justify-between px-5 py-4">
              <span className="text-sm font-medium">{COST_LABELS[mode]}</span>
              <span className="font-mono text-sm text-brand">{CREDIT_COST[mode]} credits</span>
            </div>
          ))}
        </div>
      </Section>

      <Section id="faq" className="border-t border-border">
        <SectionHeading eyebrow="FAQ" title="Billing and licensing" />
        <FaqList />
      </Section>

      <CtaBanner />
    </>
  );
}
