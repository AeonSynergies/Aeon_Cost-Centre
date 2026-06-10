/** Extended/derived model types beyond the raw Prisma rows. */
import type { Period } from "@/lib/metrics";

export type { Period };

export type ResourceStatus = "ACTIVE" | "TERMED";
export type ClientStatus = "ACTIVE" | "CHURNED" | "ENDING";
