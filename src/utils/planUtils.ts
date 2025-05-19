import { PlanStatus, TravelPlanType } from "@/data/TravelPlan";

export function getPlanStatus(plan: TravelPlanType, now: number): PlanStatus {
  if (plan.isManuallyCompleted) return "completed";

  const oneDay = 24 * 60 * 60 * 1000; // 一天的毫秒数

  if (now > plan.endTime) return "expired";
  if (now >= plan.startTime && now <= plan.endTime) return "in-progress";
  if (now >= plan.startTime - oneDay && now < plan.startTime) return "upcoming";
  return "not-started";
}

export function getProgressPercentage(
  plan: TravelPlanType,
  now: number
): number {
  if (now < plan.startTime) return 0;
  if (now > plan.endTime) return 100;

  const totalDuration = plan.endTime - plan.startTime;
  const elapsed = now - plan.startTime;

  return Math.round((elapsed / totalDuration) * 100);
}
