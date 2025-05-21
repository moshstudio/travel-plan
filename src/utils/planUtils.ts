import { TravelPlanStatus, TravelPlanType } from "@/data/TravelPlan";
import { useStore } from "@/store";

export function getPlanStatus(
  plan: TravelPlanType,
  now: Date
): TravelPlanStatus {
  const nowTime = now.getTime();
  if (plan.status == "completed") return TravelPlanStatus.completed;
  if (plan.status == "deleted") return TravelPlanStatus.deleted;
  if (plan.status == "cancelled") return TravelPlanStatus.cancelled;

  const oneDay = 24 * 60 * 60 * 1000; // 一天的毫秒数
  if (nowTime >= plan.startDateTime - oneDay && nowTime < plan.startDateTime) {
    if (plan.status != TravelPlanStatus.upcoming) {
      plan.status = TravelPlanStatus.upcoming;
      const store = useStore();
      store.updateTravelPlan(plan);
    }
  }
  if (nowTime > plan.endDateTime) {
    if (plan.status != TravelPlanStatus.expired) {
      plan.status = TravelPlanStatus.expired;
      const store = useStore();
      store.updateTravelPlan(plan);
    }
  }
  if (nowTime >= plan.startDateTime && nowTime <= plan.endDateTime) {
    if (plan.status != TravelPlanStatus.inProgress) {
      plan.status = TravelPlanStatus.inProgress;
      const store = useStore();
      store.updateTravelPlan(plan);
    }
  }
  return plan.status;
}

export function getProgressPercentage(plan: TravelPlanType, now: Date): number {
  const nowTime = now.getTime();
  if (nowTime < plan.startDateTime) return 0;
  if (nowTime > plan.endDateTime) return 100;

  const totalDuration = plan.endDateTime - plan.startDateTime;
  const elapsed = nowTime - plan.startDateTime;

  return Math.round((elapsed / totalDuration) * 100);
}
