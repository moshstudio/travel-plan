import { PayMethod } from "@/data/expense";
import { TravelPlanStatus, TravelPlanType } from "@/data/TravelPlan";

export function getPlanStatus(
  plan: TravelPlanType,
  now: Date
): TravelPlanStatus {
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

export function getPlanPriorityColor(
  priority: "low" | "medium" | "high"
): string {
  const color =
    priority === "low"
      ? getComputedStyle(document.documentElement)
          .getPropertyValue("--plan-priority-low")
          .trim()
      : priority === "medium"
      ? getComputedStyle(document.documentElement)
          .getPropertyValue("--plan-priority-medium")
          .trim()
      : getComputedStyle(document.documentElement)
          .getPropertyValue("--plan-priority-high")
          .trim();
  return color;
}

export function getPlanStatusColor(status: TravelPlanStatus): string {
  const style = getComputedStyle(document.documentElement);
  switch (status) {
    case "planned":
      return style.getPropertyValue("--plan-planned").trim();
    case "upcoming":
      return style.getPropertyValue("--plan-upcoming").trim();
    case "in-progress":
      return style.getPropertyValue("--plan-in-progress").trim();
    case "completed":
      return style.getPropertyValue("--plan-completed").trim();
    case "expired":
      return style.getPropertyValue("--plan-expired").trim();
    case "cancelled":
      return style.getPropertyValue("--plan-cancelled").trim();
    case "deleted":
      return style.getPropertyValue("--plan-deleted").trim();
    default:
      return style.getPropertyValue("--plan-planned").trim();
  }
}

export function getPlanStatusText(status?: TravelPlanStatus): string {
  if (!status) return "";
  switch (status) {
    case TravelPlanStatus.planned:
      return "计划中";
    case TravelPlanStatus.upcoming:
      return "即将开始";
    case TravelPlanStatus.inProgress:
      return "进行中";
    case TravelPlanStatus.expired:
      return "已过期";
    case TravelPlanStatus.completed:
      return "已完成";
    case TravelPlanStatus.cancelled:
      return "已取消";
    case TravelPlanStatus.deleted:
      return "已删除";
  }
}

export function getExpensePayMethodColor(payMethod: PayMethod | undefined) {
  if (!payMethod) return "";
  switch (payMethod) {
    case PayMethod.alipay:
      return "#1677FF";

    case PayMethod.wechat_pay:
      return "#07C160";

    case PayMethod.cash:
      return "#FFD700";

    case PayMethod.credit_card:
      return "#FF6B81";

    case PayMethod.bank_transfer:
      return "#2E8B57";

    case PayMethod.other:
      return "#A9A9A9";
  }
}
