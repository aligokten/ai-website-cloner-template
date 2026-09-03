import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

// Required so both files also emit during a static export build.
export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["", "/features", "/pricing", "/discover", "/workspace"];
  return routes.map((route) => ({
    url: `${site.url}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.7,
  }));
}
