import { Section, SectionHeading } from "@/components/marketing/section";
import { FEATURES } from "@/lib/content";

export function FeaturesGrid() {
  return (
    <Section id="features" className="border-t border-border bg-surface/25">
      <SectionHeading
        eyebrow="Features"
        title="Built for the parts of 3D that are actually slow"
        description="Generation is the easy half. SAGG3D also handles topology, materials, rigging and delivery."
      />
      <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => (
          <article key={feature.id} id={feature.id} className="surface-card scroll-mt-24 p-6">
            <h3 className="text-lg font-semibold">{feature.title}</h3>
            <p className="mt-2.5 text-sm leading-relaxed text-muted-foreground">
              {feature.description}
            </p>
            <ul className="mt-5 flex flex-wrap gap-1.5">
              {feature.bullets.map((bullet) => (
                <li
                  key={bullet}
                  className="rounded-md border border-border bg-background px-2 py-1 text-[0.7rem] text-muted-foreground"
                >
                  {bullet}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </Section>
  );
}
