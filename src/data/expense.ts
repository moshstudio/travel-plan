import { AddressType } from "./address";
import { AttachmentType } from "./attachments";

export interface TravelExpenseType {
  id: number;
  expenseId: string;
  travelId: string;
  amount: number;
  currency: "CNY" | "USD" | "EUR";
  tags?: string[];
  description?: string;
  dateTime: Date;
  paymentMethod: PayMethod;
  location: AddressType;
  sharedWith?: string[];
  attachments?: AttachmentType[];
  isReimbursed?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export enum PayMethod {
  cash = "cash",
  credit_card = "credit_card",
  alipay = "alipay",
  wechat_pay = "wechat_pay",
  bank_transfer = "bank_transfer",
  other = "other",
}
