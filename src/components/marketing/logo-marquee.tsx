const STUDIOS = [
  "NORTHLIGHT GAMES",
  "PIXELFORGE",
  "AURORA XR",
  "BYTEHAUS",
  "MERIDIAN STUDIO",
  "TOYBOX LABS",
  "HELIOS INTERACTIVE",
  "CRAFTWORKS",
];

export function LogoMarquee() {
  return (
    <section className="border-y border-border bg-surface/30 py-8">
      <p className="container-page text-center text-xs uppercase tracking-[0.2em] text-muted-foreground">
        Trusted by teams shipping games, apps and product visuals
      </p>
      <div className="relative mt-6 overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_12%,#000_88%,transparent)]">
        <div className="flex w-max animate-marquee items-center gap-14 pr-14">
          {[...STUDIOS, ...STUDIOS].map((studio, index) => (
            <span
              key={`${studio}-${index}`}
              className="whitespace-nowrap text-sm font-semibold tracking-[0.16em] text-muted-foreground/70"
            >
              {studio}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
