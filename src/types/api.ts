/** API response and shared data shapes used across the client. */

export interface ReferenceData {
  departments: { id: string; name: string; category: string }[];
  costCentres: { id: string; name: string; departmentId: string | null }[];
  services: {
    id: string;
    code: string;
    name: string;
    departmentId: string;
    costCentreId: string;
    packages: { packageType: string; monthlyFeeUsd: number }[];
  }[];
  clients: { id: string; name: string; endDate: string | null }[];
  resources: { id: string; name: string; employeeNumber: string }[];
}

export interface ListResponse<T> {
  data: T[];
  summary?: Record<string, number>;
}
