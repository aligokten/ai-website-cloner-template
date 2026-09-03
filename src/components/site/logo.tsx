import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={cn("size-7", className)} aria-hidden="true">
      <defs>
        <linearGradient id="sagg-logo" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--brand)" />
          <stop offset="1" stopColor="var(--brand-2)" />
        </linearGradient>
      </defs>
      <path
        d="M16 2.5 28.5 9.4v13.2L16 29.5 3.5 22.6V9.4L16 2.5Z"
        stroke="url(#sagg-logo)"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M16 9 22.8 12.8v7.4L16 24l-6.8-3.8v-7.4L16 9Z"
        fill="url(#sagg-logo)"
        fillOpacity="0.85"
      />
      <path d="M16 2.5v6.6M28.5 9.4 22.8 12.8M3.5 9.4l5.7 3.4M16 24v5.5" stroke="url(#sagg-logo)" strokeWidth="1.4" />
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <LogoMark />
      <span className="text-[1.05rem] font-semibold tracking-tight">
        SAGG3D<span className="text-brand">.ai</span>
      </span>
    </span>
  );
}
