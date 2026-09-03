export const site = {
  name: "SAGG3D.ai",
  shortName: "SAGG3D",
  domain: "sagg3d.ai",
  url: "https://sagg3d.ai",
  tagline: "The AI 3D model generator",
  description:
    "SAGG3D.ai turns text and images into production-ready 3D models in seconds. Generate, texture, remesh, animate and export to FBX, OBJ, GLB, USDZ, STL and Blender.",
  nav: [
    { label: "Features", href: "/features" },
    { label: "Discover", href: "/discover" },
    { label: "Pricing", href: "/pricing" },
    { label: "Workspace", href: "/workspace" },
  ],
  footer: [
    {
      title: "Product",
      links: [
        { label: "Text to 3D", href: "/features#text-to-3d" },
        { label: "Image to 3D", href: "/features#image-to-3d" },
        { label: "AI Texturing", href: "/features#texturing" },
        { label: "Remesh", href: "/features#remesh" },
        { label: "Animate", href: "/features#animate" },
        { label: "Workspace", href: "/workspace" },
      ],
    },
    {
      title: "Resources",
      links: [
        { label: "Discover", href: "/discover" },
        { label: "Pricing", href: "/pricing" },
        { label: "Export formats", href: "/features#formats" },
        { label: "Integrations", href: "/features#integrations" },
        { label: "FAQ", href: "/pricing#faq" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About", href: "/#story" },
        { label: "Blog", href: "/#story" },
        { label: "Careers", href: "/#story" },
        { label: "Contact", href: "/#cta" },
      ],
    },
    {
      title: "Legal",
      links: [
        { label: "Terms", href: "/#legal" },
        { label: "Privacy", href: "/#legal" },
        { label: "License", href: "/pricing#faq" },
        { label: "Security", href: "/#legal" },
      ],
    },
  ],
} as const;
