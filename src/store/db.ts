import { TravelChecklistType } from "@/data/checklist";
import { TravelExpenseType } from "@/data/expense";
import { ParticipantType } from "@/data/participants";
import { TravelPlanType, TravelType } from "@/data/TravelPlan";
import Dexie from "dexie";
import { nanoid } from "nanoid";

export interface KVType {
  id: number;
  key: string;
  value: any;
}

class TravelPlannerDB extends Dexie {
  currentTravel: Dexie.Table<TravelType, number>;
  travels: Dexie.Table<TravelType, number>;
  travelPlans: Dexie.Table<TravelPlanType, number>;
  travelChecklists: Dexie.Table<TravelChecklistType, number>;
  travelExpenses: Dexie.Table<TravelExpenseType, number>;
  participants: Dexie.Table<ParticipantType, number>;
  kvs: Dexie.Table<KVType, number>;

  constructor() {
    super("TravelPlannerDB");

    this.version(1).stores({
      currentTravel:
        "++id, travelId, name, startDateTime, endDateTime, createdAt",
      travels: "++id, travelId, name, startDateTime, endDateTime, createdAt",
      travelPlans:
        "++id, travelPlanId, travelId, title, description, tags, startDateTime, endDateTime, isAllDay, timezone, location, status, priority, budget, attachments, participants, createdAt, updatedAt, createdBy, version, recurrence",
      travelChecklists:
        "++id, itemId, travelId, name, category, isPacked, quantity, priority, notes, createdAt, updatedAt",

      travelExpenses:
        "++id, expenseId, travelId, amount, currency, tags, description, dateTime, paymentMethod, location, sharedWith, attachments, isReimbursed, createdAt, updatedAt",
      participants: "++id, userId, name, defaultRole",
      kvs: "++id, key, value",
    });

    this.currentTravel = this.table("currentTravel");
    this.travels = this.table("travels");
    this.travelPlans = this.table("travelPlans");
    this.travelChecklists = this.table("travelChecklists");
    this.travelExpenses = this.table("travelExpenses");
    this.participants = this.table("participants");
    this.kvs = this.table("kvs");

    this.currentTravel.hook("creating", function (primKey, obj, transaction) {
      if (!obj.travelId) {
        obj.travelId = nanoid();
      }
    });
    this.travels.hook("creating", function (primKey, obj, transaction) {
      if (!obj.travelId) {
        obj.travelId = nanoid();
      }
    });
    this.travelPlans.hook("creating", function (primKey, obj, transaction) {
      if (!obj.travelPlanId) {
        obj.travelPlanId = nanoid();
      }
    });
    this.travelChecklists.hook(
      "creating",
      function (primKey, obj, transaction) {
        if (!obj.itemId) {
          obj.itemId = nanoid();
        }
      }
    );
    this.travelExpenses.hook("creating", function (primKey, obj, transaction) {
      if (!obj.expenseId) {
        obj.expenseId = nanoid();
      }
    });
    this.participants.hook("creating", function (primKey, obj, transaction) {
      if (!obj.userId) {
        obj.userId = nanoid();
      }
    });
  }
}

const db = new TravelPlannerDB();

export default db;
