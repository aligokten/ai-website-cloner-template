import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export function CtaBanner() {
  return (
    <section id="cta" className="scroll-mt-24 py-20 sm:py-24">
      <div className="container-page">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-surface px-6 py-16 text-center sm:px-16">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-64 opacity-50 blur-3xl"
            style={{
              background:
                "radial-gradient(closest-side, color-mix(in oklab, var(--brand) 60%, transparent), transparent)",
            }}
            aria-hidden="true"
          />
          <div className="relative">
            <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              Your next asset is one prompt away
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-pretty text-muted-foreground">
              Start with 100 free credits a month. Generate, refine, animate and export
              without installing anything.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                variant="brand"
                size="2xl"
                render={
                  <Link href="/workspace">
                    Open the workspace
                    <ArrowRight />
                  </Link>
                }
              />
              <Button variant="soft" size="2xl" render={<Link href="/pricing">Compare plans</Link>} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
