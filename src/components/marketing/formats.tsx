import { Section, SectionHeading } from "@/components/marketing/section";
import { INTEGRATIONS } from "@/lib/content";
import { EXPORT_FORMATS } from "@/lib/three/export";

export function Formats() {
  return (
    <Section id="formats">
      <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
        <div>
          <SectionHeading
            align="left"
            eyebrow="Delivery"
            title="Export into the tools you already use"
            description="Every download is a real, openable file generated from the mesh in your viewport — not a placeholder."
          />
          <ul className="mt-8 space-y-3">
            {EXPORT_FORMATS.map((format) => (
              <li
                key={format.id}
                className="flex items-center justify-between rounded-xl border border-border bg-surface px-4 py-3"
              >
                <span className="flex items-center gap-3">
                  <span className="rounded-md bg-brand/12 px-2 py-1 font-mono text-xs uppercase text-brand">
                    .{format.extension}
                  </span>
                  <span className="text-sm font-medium">{format.label}</span>
                </span>
                <span className="hidden text-xs text-muted-foreground sm:block">{format.hint}</span>
              </li>
            ))}
          </ul>
        </div>

        <div id="integrations" className="scroll-mt-24">
          <SectionHeading
            align="left"
            eyebrow="Integrations"
            title="Drops into your pipeline"
            description="Bridge plugins push assets straight from the workspace into your DCC, and the REST API plus MCP endpoints let agents generate on their own."
          />
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
            {INTEGRATIONS.map((tool) => (
              <div
                key={tool}
                className="flex h-20 items-center justify-center rounded-xl border border-border bg-surface text-sm font-medium text-muted-foreground transition-colors hover:border-brand/40 hover:text-foreground"
              >
                {tool}
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-xl border border-border bg-surface p-4 font-mono text-xs leading-relaxed text-muted-foreground">
            <span className="text-brand">POST</span> /api/generate
            <br />
            {"{ \"mode\": \"text-to-3d\", \"prompt\": \"stone golem\", \"style\": \"realistic\" }"}
          </div>
        </div>
      </div>
    </Section>
  );
}
