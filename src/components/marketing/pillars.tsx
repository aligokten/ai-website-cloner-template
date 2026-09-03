import { Boxes, Palette, PersonStanding, Share2 } from "lucide-react";
import { Section, SectionHeading } from "@/components/marketing/section";
import { PILLARS } from "@/lib/content";

const ICONS = {
  generate: Boxes,
  refine: Palette,
  animate: PersonStanding,
  deliver: Share2,
} as const;

export function Pillars() {
  return (
    <Section id="pillars">
      <SectionHeading
        eyebrow="The pipeline"
        title="Everything between an idea and a shipped asset"
        description="Four stages, one workspace. Nothing to install, nothing to hand off."
      />
      <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PILLARS.map((pillar) => {
          const Icon = ICONS[pillar.id];
          return (
            <div
              key={pillar.id}
              className="group surface-card p-6 transition-colors hover:border-brand/40"
            >
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-brand/12 text-brand transition-transform group-hover:scale-105">
                <Icon className="size-5" />
              </span>
              <h3 className="mt-5 text-lg font-semibold">{pillar.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{pillar.blurb}</p>
              <ul className="mt-5 space-y-2 border-t border-border pt-4">
                {pillar.items.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span className="size-1.5 rounded-full bg-brand" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </Section>
  );
}
