import { Quote } from "lucide-react";
import { Section, SectionHeading } from "@/components/marketing/section";
import { TESTIMONIALS } from "@/lib/content";

export function Testimonials() {
  return (
    <Section id="testimonials" className="border-t border-border bg-surface/25">
      <SectionHeading eyebrow="Customers" title="What creators ship with it" />
      <div className="mt-14 grid gap-4 md:grid-cols-3">
        {TESTIMONIALS.map((item) => (
          <figure key={item.name} className="surface-card flex h-full flex-col p-6">
            <Quote className="size-5 text-brand" />
            <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-muted-foreground">
              “{item.quote}”
            </blockquote>
            <figcaption className="mt-6 border-t border-border pt-4">
              <span className="block text-sm font-semibold">{item.name}</span>
              <span className="block text-xs text-muted-foreground">{item.role}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </Section>
  );
}
