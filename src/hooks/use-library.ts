"use client";

import { useCallback, useMemo } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import type { Asset } from "@/types";

const STORAGE_KEY = "sagg3d:library:v1";
const MAX_ASSETS = 60;
const EMPTY: Asset[] = [];

export function useLibrary() {
  const [assets, setAssets, hydrated] = useLocalStorage<Asset[]>(STORAGE_KEY, EMPTY);

  const add = useCallback(
    (asset: Asset) => {
      setAssets((current) => [asset, ...current].slice(0, MAX_ASSETS));
    },
    [setAssets],
  );

  const update = useCallback(
    (id: string, patch: Partial<Asset>) => {
      setAssets((current) =>
        current.map((asset) =>
          asset.id === id ? { ...asset, ...patch, updatedAt: Date.now() } : asset,
        ),
      );
    },
    [setAssets],
  );

  const remove = useCallback(
    (id: string) => setAssets((current) => current.filter((asset) => asset.id !== id)),
    [setAssets],
  );

  const duplicate = useCallback(
    (id: string) => {
      setAssets((current) => {
        const source = current.find((asset) => asset.id === id);
        if (!source) return current;
        const copy: Asset = {
          ...source,
          id: `asset_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
          name: `${source.name} copy`,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        return [copy, ...current].slice(0, MAX_ASSETS);
      });
    },
    [setAssets],
  );

  const clear = useCallback(() => setAssets([]), [setAssets]);

  const stats = useMemo(
    () => ({
      total: assets.length,
      favorites: assets.filter((asset) => asset.favorite).length,
      credits: assets.reduce((sum, asset) => sum + asset.credits, 0),
    }),
    [assets],
  );

  return { assets, hydrated, add, update, remove, duplicate, clear, stats };
}
