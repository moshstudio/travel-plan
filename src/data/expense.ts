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
  dateTime: number;
  paymentMethod:
    | "cash" // 现金
    | "credit_card" // 信用卡
    | "alipay" // 支付宝"
    | "wechat_pay" // 微信支付
    | "bank_transfer" // 银行转账
    | "other"; // 其他支付方式

  location?: AddressType;
  sharedWith?: string[];
  attachments?: AttachmentType[];
  isReimbursed?: boolean;
  createdAt: string;
  updatedAt: string;
}
