"use client";

import { useCallback } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import type { ProviderId } from "@/lib/providers/types";

export interface ProviderSettings {
  providerId: ProviderId;
  /** The user's own key. Kept in this browser only and sent to that provider only. */
  apiKey: string;
}

const STORAGE_KEY = "sagg3d:provider:v1";
const INITIAL: ProviderSettings = { providerId: "local", apiKey: "" };

export function useProviderSettings() {
  const [settings, setSettings] = useLocalStorage<ProviderSettings>(STORAGE_KEY, INITIAL);

  const update = useCallback(
    (patch: Partial<ProviderSettings>) => setSettings((current) => ({ ...current, ...patch })),
    [setSettings],
  );

  const clear = useCallback(() => setSettings(INITIAL), [setSettings]);

  const active = settings.providerId !== "local" && settings.apiKey.trim().length > 0;

  return { settings, update, clear, active };
}
