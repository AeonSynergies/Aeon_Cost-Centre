"use client";

import useSWRImmutable from "swr/immutable";
import { apiGet } from "@/lib/api-client";
import type { ReferenceData } from "@/types/api";

/** Loads the shared dropdown reference lists (cached, immutable). */
export function useReference() {
  return useSWRImmutable<ReferenceData>("/api/reference", apiGet);
}

export type { ReferenceData };
