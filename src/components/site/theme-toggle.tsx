"use client";

import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "sagg3d:theme";

/**
 * The theme lives on <html> (set before paint by an inline script), so this
 * button reads and writes the DOM directly and lets CSS pick the icon. That
 * keeps the server and client markup identical — no hydration flash.
 */
export function ThemeToggle() {
  const toggle = () => {
    const root = document.documentElement;
    const light = root.classList.toggle("light");
    try {
      window.localStorage.setItem(STORAGE_KEY, light ? "light" : "dark");
    } catch {
      // Storage blocked — the toggle still works for this session.
    }
  };

  return (
    <Button variant="ghost" size="icon-sm" aria-label="Toggle color theme" onClick={toggle}>
      <Moon className="[.light_&]:hidden" />
      <Sun className="hidden [.light_&]:block" />
    </Button>
  );
}
