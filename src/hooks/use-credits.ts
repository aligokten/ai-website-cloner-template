"use client";

import { useCallback } from "react";
import { useLocalStorage } from "@/hooks/use-local-storage";
import { PLANS, type PlanId } from "@/lib/pricing";
import type { CreditState } from "@/types";

const STORAGE_KEY = "sagg3d:credits:v1";

const cycleKey = () => new Date().toISOString().slice(0, 7);

const allowanceFor = (plan: PlanId): number => {
  const found = PLANS.find((entry) => entry.id === plan);
  return found?.credits ?? 100;
};

const INITIAL: CreditState = {
  plan: "free",
  balance: 100,
  monthly: 100,
  spent: 0,
  cycle: cycleKey(),
};

export function useCredits() {
  const [state, setState, hydrated] = useLocalStorage<CreditState>(STORAGE_KEY, INITIAL);

  // Refill on a new calendar month, the way a real billing cycle would.
  const current: CreditState =
    hydrated && state.cycle !== cycleKey()
      ? { ...state, balance: state.monthly, spent: 0, cycle: cycleKey() }
      : state;

  const spend = useCallback(
    (amount: number): boolean => {
      let ok = false;
      setState((value) => {
        const fresh =
          value.cycle === cycleKey()
            ? value
            : { ...value, balance: value.monthly, spent: 0, cycle: cycleKey() };
        if (fresh.balance < amount) return fresh;
        ok = true;
        return { ...fresh, balance: fresh.balance - amount, spent: fresh.spent + amount };
      });
      return ok;
    },
    [setState],
  );

  const refund = useCallback(
    (amount: number) => {
      setState((value) => ({
        ...value,
        balance: Math.min(value.monthly, value.balance + amount),
        spent: Math.max(0, value.spent - amount),
      }));
    },
    [setState],
  );

  const setPlan = useCallback(
    (plan: PlanId) => {
      if (plan === "enterprise") return;
      const monthly = allowanceFor(plan);
      setState((value) => ({
        ...value,
        plan: plan as CreditState["plan"],
        monthly,
        balance: monthly,
        spent: 0,
        cycle: cycleKey(),
      }));
    },
    [setState],
  );

  const reset = useCallback(() => setState({ ...INITIAL, cycle: cycleKey() }), [setState]);

  return { credits: current, hydrated, spend, refund, setPlan, reset };
}
