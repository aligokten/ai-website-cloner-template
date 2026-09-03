"use client";

import { Check, Cpu, Eye, EyeOff, KeyRound } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PROVIDERS } from "@/lib/providers";
import type { ProviderId } from "@/lib/providers/types";
import type { ProviderSettings } from "@/hooks/use-provider-settings";
import { cn } from "@/lib/utils";

const OPTIONS: Array<{ id: ProviderId; label: string; hint: string }> = [
  {
    id: "local",
    label: "Built-in engine",
    hint: "Procedural, instant, no key. Shapes are assembled from the prompt.",
  },
  {
    id: "meshy",
    label: PROVIDERS.meshy.label,
    hint: "Real text-to-3D and image-to-3D. Needs a Meshy API key.",
  },
  {
    id: "tripo",
    label: PROVIDERS.tripo.label,
    hint: "Real text-to-3D and image-to-3D. Needs a Tripo API key.",
  },
];

export function ProviderPanel({
  settings,
  onChange,
  onClose,
}: {
  settings: ProviderSettings;
  onChange: (patch: Partial<ProviderSettings>) => void;
  onClose: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const needsKey = settings.providerId !== "local";

  return (
    <div className="rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Cpu className="size-4 text-brand" />
            Generation engine
          </h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Point the workspace at a real 3D model to get output that matches your prompt.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Done
        </Button>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        {OPTIONS.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange({ providerId: option.id })}
            className={cn(
              "rounded-xl border p-3 text-left transition-colors",
              settings.providerId === option.id
                ? "border-brand bg-brand/10"
                : "border-border hover:border-brand/40",
            )}
          >
            <span className="flex items-center gap-1.5 text-sm font-medium">
              {settings.providerId === option.id ? <Check className="size-3.5 text-brand" /> : null}
              {option.label}
            </span>
            <span className="mt-1 block text-[0.7rem] leading-relaxed text-muted-foreground">
              {option.hint}
            </span>
          </button>
        ))}
      </div>

      {needsKey ? (
        <div className="mt-4">
          <label htmlFor="provider-key" className="text-sm font-medium">
            API key
          </label>
          <div className="mt-2 flex gap-2">
            <div className="relative flex-1">
              <KeyRound className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                id="provider-key"
                type={visible ? "text" : "password"}
                value={settings.apiKey}
                onChange={(event) => onChange({ apiKey: event.target.value.trim() })}
                placeholder="msy_… / tsk_…"
                autoComplete="off"
                spellCheck={false}
                className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 font-mono text-sm outline-none focus:border-brand focus:ring-3 focus:ring-brand/25"
              />
            </div>
            <Button
              variant="soft"
              size="lg"
              aria-label={visible ? "Hide key" : "Show key"}
              onClick={() => setVisible((value) => !value)}
            >
              {visible ? <EyeOff /> : <Eye />}
            </Button>
          </div>
          <p className="mt-2 text-[0.7rem] leading-relaxed text-muted-foreground">
            The key stays in this browser&apos;s local storage and is sent only to{" "}
            {settings.providerId}. If the provider blocks browser requests (CORS), run the app on a
            server with <code className="font-mono">SAGG3D_PROVIDER</code> and{" "}
            <code className="font-mono">SAGG3D_API_KEY</code> set instead — then no key is stored
            here at all.
          </p>
        </div>
      ) : null}
    </div>
  );
}
