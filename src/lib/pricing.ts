import type { TaskMode } from "@/types";

export const CREDIT_COST: Record<TaskMode, number> = {
  "text-to-3d": 20,
  "image-to-3d": 20,
  texture: 10,
  remesh: 5,
  animate: 10,
};

export const PLANS = [
  {
    id: "free",
    name: "Free",
    monthly: 0,
    annual: 0,
    credits: 100,
    blurb: "Try every core tool. No credit card required.",
    cta: "Start for free",
    highlight: false,
    features: [
      "100 credits every month",
      "Text to 3D and Image to 3D",
      "1 task in the queue at a time",
      "Standard queue priority",
      "Assets are public, CC BY 4.0",
      "Export to GLB, OBJ, STL",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    monthly: 20,
    annual: 240,
    credits: 1_000,
    blurb: "For solo creators shipping real projects.",
    cta: "Upgrade to Pro",
    highlight: true,
    features: [
      "1,000 credits every month",
      "Private, fully owned assets",
      "10 concurrent tasks",
      "High queue priority",
      "AI texturing, remesh and animation",
      "All export formats + API access",
    ],
  },
  {
    id: "studio",
    name: "Studio",
    monthly: 60,
    annual: 576,
    credits: 4_000,
    blurb: "For teams with a shared asset pipeline.",
    cta: "Start Studio trial",
    highlight: false,
    features: [
      "4,000 credits per seat, pooled",
      "Team workspaces and shared folders",
      "20 concurrent tasks",
      "Highest queue priority",
      "DCC bridge plugins",
      "Priority support",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    monthly: null,
    annual: null,
    credits: null,
    blurb: "Custom infrastructure, security review, SSO.",
    cta: "Talk to sales",
    highlight: false,
    features: [
      "Custom credit volume",
      "SSO / SAML and audit logs",
      "Dedicated capacity",
      "Custom model fine-tuning",
      "Security and legal review",
      "Named solutions engineer",
    ],
  },
] as const;

export type PlanId = (typeof PLANS)[number]["id"];
