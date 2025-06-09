import { AddressType } from "./address";
import { AttachmentType } from "./attachments";
import { ParticipantType } from "./participants";
import { RecurrenceType } from "./recurrence";

export interface TravelType {
  id: number; // 自动生成的唯一ID
  travelId: string;
  name: string; //"2023夏季欧洲之旅";
  description?: string; // "为期两周的欧洲多国旅行";
  startDateTime?: number;
  endDateTime?: number;
  createdAt: number;
}

export interface TravelPlanType {
  id: number;
  travelPlanId: string;
  travelId: string;
  title?: string;
  description?: string;
  tags?: string[];
  startDateTime: number;
  endDateTime: number;
  timezone: string; //"Asia/Shanghai"; // 时区信息
  location: AddressType;
  status: TravelPlanStatus;
  priority: "low" | "medium" | "high";
  budget?: number; // 预算(元)
  attachments?: AttachmentType[];
  participants?: ParticipantType[];
  createdAt: number;
  updatedAt: number;
  createdBy?: string; // 创建人ID
  version: number; // 数据版本号(用于同步冲突解决)
  recurrence?: RecurrenceType;
}

export enum TravelPlanStatus {
  planned = "planned", // 初始默认
  upcoming = "upcoming", // 即将开始
  inProgress = "in-progress", // 进行中
  expired = "expired", // 已过期
  completed = "completed", // 已完成
  cancelled = "cancelled", // 已取消
  deleted = "deleted", // 已删除
}
