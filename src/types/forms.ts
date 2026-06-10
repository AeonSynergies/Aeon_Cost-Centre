/** Form input types + Zod schemas shared between client forms and API. */
import { z } from "zod";

export const resourceFormSchema = z.object({
  employeeNumber: z.string().min(1),
  name: z.string().min(1),
  title: z.string().min(1),
  departmentId: z.string().min(1),
  costCentreId: z.string().min(1),
  joinedDate: z.string().min(1),
  isBillable: z.boolean().default(false),
  workingDays: z.array(z.number().int().min(0).max(6)).default([1, 2, 3, 4, 5]),
  dailyWorkHours: z.number().min(0).default(8),
  baseSalary: z.number().min(0),
  incentive: z.number().min(0).default(0),
  allowance: z.number().min(0).default(0),
  effectiveFrom: z.string().optional(),
});
export type ResourceFormInput = z.infer<typeof resourceFormSchema>;

export const clientServiceSchema = z.object({
  serviceId: z.string().min(1),
  packageType: z.enum(["LESS_THAN_25", "MORE_THAN_25"]),
  monthlyFeeUsd: z.number().min(0),
  discountMode: z.enum(["PER_SERVICE", "PER_PACKAGE", "TOTAL"]).default("PER_PACKAGE"),
  discountPct: z.number().min(0).max(100).default(0),
});
export type ClientServiceInput = z.infer<typeof clientServiceSchema>;
