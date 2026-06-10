"use client";

import useSWRImmutable from "swr/immutable";
import { apiGet } from "@/lib/api-client";

export interface CurrencyConfig {
  rateA: number;
  rateB: number;
  rateC: number;
  rateD: number;
}

/** Loads the effective currency rates from /api/settings (falls back to defaults). */
export function useCurrencyConfig() {
  return useSWRImmutable<CurrencyConfig>("/api/settings/rates", async (url: string) => {
    try {
      return await apiGet<CurrencyConfig>(url);
    } catch {
      return { rateA: 91, rateB: 86, rateC: 82, rateD: 80 };
    }
  });
}
