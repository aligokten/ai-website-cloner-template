import { ArrowRight, Star } from "lucide-react";
import Link from "next/link";
import { HeroGenerator } from "@/components/marketing/hero-generator";
import { Button } from "@/components/ui/button";

const TRUST = [
  { value: "580,000+", label: "models generated" },
  { value: "20-30s", label: "average generation" },
  { value: "7", label: "export formats" },
  { value: "4.8/5", label: "creator rating" },
];

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-14 pb-8 sm:pt-20">
      <div className="pointer-events-none absolute inset-0 grid-backdrop" aria-hidden="true" />
      <div
        className="pointer-events-none absolute left-1/2 top-[-14rem] h-[36rem] w-[64rem] -translate-x-1/2 rounded-full opacity-45 blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, color-mix(in oklab, var(--brand) 55%, transparent), transparent)",
        }}
        aria-hidden="true"
      />

      <div className="container-page relative">
        <div className="mx-auto max-w-3xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface/70 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur">
            <Star className="size-3.5 text-brand" />
            SAGG3D 6 is live — sharper geometry, 4K PBR, 600+ motions
          </span>

          <h1 className="mt-6 text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-6xl">
            Turn <span className="text-gradient">text and images</span> into
            production-ready 3D
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
            SAGG3D.ai generates textured, game-ready meshes in seconds. Refine the
            topology, paint PBR materials, rig and animate, then export straight
            into your engine.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button
              variant="brand"
              size="2xl"
              render={
                <Link href="/workspace">
                  Start creating free
                  <ArrowRight />
                </Link>
              }
            />
            <Button
              variant="soft"
              size="2xl"
              render={<Link href="/discover">Explore the gallery</Link>}
            />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            100 free credits every month · No credit card required
          </p>
        </div>

        <div className="mt-14">
          <HeroGenerator />
        </div>

        <dl className="mt-12 grid grid-cols-2 gap-6 border-t border-border pt-8 sm:grid-cols-4">
          {TRUST.map((item) => (
            <div key={item.label} className="text-center">
              <dt className="text-2xl font-semibold tracking-tight sm:text-3xl">{item.value}</dt>
              <dd className="mt-1 text-sm text-muted-foreground">{item.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
