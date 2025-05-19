export interface RecurrenceType {
  frequency: "none" | "daily" | "weekly" | "monthly";
  endCondition: "never" | "after" | "until"; // never/after/until
  occurrences?: number; // 3; // 重复次数(当endCondition为after时)
  endDate?: Date; // 结束日期(当endCondition为until时)
  excludedDates?: Date[]; // 排除的日期
}
