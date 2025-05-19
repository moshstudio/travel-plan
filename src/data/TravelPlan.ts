import { AddressType } from "./address";
import { AttachmentType } from "./attachments";
import { ParticipantType } from "./participants";
import { RecurrenceType } from "./recurrence";

export interface TravelType {
  id: number; // 自动生成的唯一ID
  travelId: string;
  name: string; //"2023夏季欧洲之旅";
  description?: string; // "为期两周的欧洲多国旅行";
  startDateTime?: number; // "2023-07-15";
  endDateTime?: number; // "2023-07-30";
  createdAt: number; // "2023-05-10T08:00:00Z";
}

export interface TravelPlanType {
  id: number;
  travelPlanId: string;
  travelId: string;
  title: string;
  description?: string;
  tags?: string[];
  startDateTime: number;
  endDateTime: number;
  isAllDay?: boolean; // 是否为全天事件(跨天计划通常设为false)
  timezone: string; //"Asia/Shanghai"; // 时区信息
  location?: AddressType;
  status: "planned" | "in-progress" | "completed" | "cancelled" | "deleted";
  priority: "low" | "medium" | "high"; // 优先级
  budget?: number; // 预算(元)
  attachments?: AttachmentType[];
  // 参与人员
  participants?: ParticipantType[];
  createdAt: number;
  updatedAt: number;
  createdBy?: string; // 创建人ID
  version: number; // 数据版本号(用于同步冲突解决)
  recurrence?: RecurrenceType;
}
