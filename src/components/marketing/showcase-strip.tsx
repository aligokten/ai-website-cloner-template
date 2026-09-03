"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Section, SectionHeading } from "@/components/marketing/section";
import { ShowcaseCard } from "@/components/marketing/showcase-card";
import { Button } from "@/components/ui/button";
import { SHOWCASE } from "@/lib/showcase";

export function ShowcaseStrip() {
  const router = useRouter();

  return (
    <Section id="showcase" className="border-t border-border bg-surface/25">
      <SectionHeading
        eyebrow="Discover"
        title="Made with SAGG3D"
        description="Every model below is generated live in your browser from the prompt beneath it. Open one to orbit it."
      />
      <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4">
        {SHOWCASE.slice(0, 8).map((item) => (
          <ShowcaseCard
            key={item.id}
            item={item}
            onOpen={(selected) => router.push(`/discover?item=${selected.id}`)}
          />
        ))}
      </div>
      <div className="mt-10 text-center">
        <Button
          variant="soft"
          size="xl"
          render={
            <Link href="/discover">
              Browse the full gallery
              <ArrowRight />
            </Link>
          }
        />
      </div>
    </Section>
  );
}
