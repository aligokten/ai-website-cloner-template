"use client";

import { Check, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PLANS } from "@/lib/pricing";
import { cn } from "@/lib/utils";

export function PricingTable({ compact = false }: { compact?: boolean }) {
  const [annual, setAnnual] = useState(false);

  return (
    <div>
      <div className="flex items-center justify-center gap-3">
        <span className={cn("text-sm", !annual && "font-medium")}>Monthly</span>
        <button
          type="button"
          role="switch"
          aria-checked={annual}
          aria-label="Toggle annual billing"
          onClick={() => setAnnual((value) => !value)}
          className={cn(
            "relative h-6 w-11 rounded-full border border-border transition-colors",
            annual ? "bg-brand" : "bg-surface-2",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 size-4 rounded-full bg-white transition-transform",
              annual ? "translate-x-6" : "translate-x-1",
            )}
          />
        </button>
        <span className={cn("text-sm", annual && "font-medium")}>
          Annual <span className="text-brand">save 20%</span>
        </span>
      </div>

      <div className="mt-10 grid gap-4 lg:grid-cols-4">
        {PLANS.map((plan) => {
          const price =
            plan.monthly === null
              ? null
              : annual
                ? Math.round(plan.annual / 12)
                : plan.monthly;
          return (
            <div
              key={plan.id}
              className={cn(
                "relative flex flex-col rounded-2xl border p-6",
                plan.highlight
                  ? "border-brand/60 bg-surface glow-brand"
                  : "border-border bg-surface",
              )}
            >
              {plan.highlight ? (
                <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-brand to-brand-2 px-2.5 py-1 text-[0.65rem] font-semibold text-white">
                  <Sparkles className="size-3" /> Most popular
                </span>
              ) : null}

              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <p className="mt-1.5 min-h-10 text-sm text-muted-foreground">{plan.blurb}</p>

              <p className="mt-5 flex items-baseline gap-1">
                {price === null ? (
                  <span className="text-3xl font-semibold tracking-tight">Custom</span>
                ) : (
                  <>
                    <span className="text-4xl font-semibold tracking-tight">${price}</span>
                    <span className="text-sm text-muted-foreground">/month</span>
                  </>
                )}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {plan.credits === null
                  ? "Custom credit volume"
                  : `${plan.credits.toLocaleString()} credits per month`}
                {annual && plan.annual ? ` · $${plan.annual} billed yearly` : ""}
              </p>

              <Button
                variant={plan.highlight ? "brand" : "soft"}
                size="xl"
                className="mt-6 w-full"
                render={
                  <Link href={plan.id === "enterprise" ? "/pricing#faq" : "/workspace"}>
                    {plan.cta}
                  </Link>
                }
              />

              {!compact ? (
                <ul className="mt-6 space-y-2.5 border-t border-border pt-5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2 text-sm text-muted-foreground">
                      <Check className="mt-0.5 size-4 shrink-0 text-brand" />
                      {feature}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
