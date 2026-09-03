import type { MetadataRoute } from "next";
import { site } from "@/lib/site";

// Required so both files also emit during a static export build.
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${site.url}/sitemap.xml`,
  };
}
