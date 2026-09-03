"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { FAQ } from "@/lib/content";
import { cn } from "@/lib/utils";

export function FaqList() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="mx-auto mt-12 max-w-3xl divide-y divide-border rounded-2xl border border-border bg-surface">
      {FAQ.map((item, index) => {
        const expanded = open === index;
        return (
          <div key={item.q}>
            <button
              type="button"
              aria-expanded={expanded}
              onClick={() => setOpen(expanded ? null : index)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
            >
              <span className="text-sm font-medium">{item.q}</span>
              <ChevronDown
                className={cn(
                  "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
                  expanded && "rotate-180",
                )}
              />
            </button>
            <div
              className={cn(
                "grid transition-all duration-300 ease-out",
                expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="overflow-hidden">
                <p className="px-5 pb-5 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
