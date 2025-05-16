import { Address } from "./addrerss";

export interface TravelPlan {
  id: string;
  name: string;
  description: string;
  location: Address;
  startTime: number;
  endTime: number;
  createdAt: number;
  updatedAt: number;
  isManuallyCompleted?: boolean;
  isCancelled?: boolean;
}

export type PlanStatus =
  | "not-started"
  | "upcoming"
  | "in-progress"
  | "completed"
  | "expired";
