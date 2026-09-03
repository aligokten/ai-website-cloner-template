import { SiteHeader } from "@/components/site/header";

export default function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <SiteHeader />
      <main className="flex-1 pt-16">{children}</main>
    </>
  );
}
