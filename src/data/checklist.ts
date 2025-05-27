export interface TravelChecklistType {
  id: number; // 唯一标识符，用于操作特定项
  itemId: string;
  travelId: string;
  name: string; // 物品/任务名称
  tag: string; // 分类（如"衣物"、"电子设备"、"证件"等）
  isPacked: boolean; // 是否已打包/完成
  quantity: number; // 数量
  importance: "low" | "medium" | "high"; // 重要性级别
  notes?: string; // 可选备注
  createdAt: Date; // 创建时间
  updatedAt: Date; // 最后更新时间
}
