import { Section, SectionHeading } from "@/components/marketing/section";
import { WORKFLOW } from "@/lib/content";

export function Workflow() {
  return (
    <Section id="how-it-works">
      <SectionHeading
        eyebrow="How it works"
        title="Three steps from prompt to engine"
      />
      <ol className="mt-14 grid gap-6 md:grid-cols-3">
        {WORKFLOW.map((item) => (
          <li key={item.step} className="relative surface-card p-6">
            <span className="font-mono text-sm text-brand">{item.step}</span>
            <h3 className="mt-3 text-lg font-semibold">{item.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
          </li>
        ))}
      </ol>
    </Section>
  );
}
