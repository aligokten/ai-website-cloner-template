import type { Metadata } from "next";
import { Suspense } from "react";
import { Workspace } from "@/components/workspace/workspace";

export const metadata: Metadata = {
  title: "Workspace",
  description:
    "Generate 3D models from text or images, retexture, remesh, animate and export them — the SAGG3D.ai workspace.",
};

export default function WorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="container-page py-16 text-sm text-muted-foreground">
          Loading workspace…
        </div>
      }
    >
      <Workspace />
    </Suspense>
  );
}
