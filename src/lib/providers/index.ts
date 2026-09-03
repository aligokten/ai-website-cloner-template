import { meshyProvider } from "@/lib/providers/meshy";
import { tripoProvider } from "@/lib/providers/tripo";
import type { GenerationProvider, ProviderId } from "@/lib/providers/types";

export const PROVIDERS: Record<Exclude<ProviderId, "local">, GenerationProvider> = {
  meshy: meshyProvider,
  tripo: tripoProvider,
};

export function providerById(id: string | undefined | null): GenerationProvider | null {
  if (!id || id === "local") return null;
  return PROVIDERS[id as Exclude<ProviderId, "local">] ?? null;
}

/**
 * Server-side configuration. Set SAGG3D_PROVIDER (meshy | tripo) and
 * SAGG3D_API_KEY to route generation through a real 3D model instead of the
 * built-in procedural engine.
 */
export function serverProvider(): { provider: GenerationProvider; key: string } | null {
  const key = process.env.SAGG3D_API_KEY;
  const provider = providerById(process.env.SAGG3D_PROVIDER);
  if (!provider || !key) return null;
  return { provider, key };
}

export * from "@/lib/providers/types";
