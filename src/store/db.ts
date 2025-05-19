import { AddressType } from "@/data/address";
import { ParticipantType } from "@/data/participants";
import { TravelPlanType, TravelType } from "@/data/TravelPlan";
import Dexie from "dexie";
import { nanoid } from "nanoid";

class TravelPlannerDB extends Dexie {
  travels: Dexie.Table<TravelType, number>;
  travelPlans: Dexie.Table<TravelPlanType, number>;
  participants: Dexie.Table<ParticipantType, string>;
  addresses: Dexie.Table<AddressType, number>;

  constructor() {
    super("TravelPlannerDB");

    this.version(1).stores({
      travels: "++id, travelId, name, startDateTime, endDateTime, createdAt",
      travelPlans:
        "++id, travelPlanId, travelId, title, startDateTime, endDateTime, status, priority, createdAt, updatedAt",
      participants: "++id, userId, name, defaultRole",
      addresses: "++id, name",
    });

    this.travels = this.table("travels");
    this.travelPlans = this.table("travelPlans");
    this.participants = this.table("participants");
    this.addresses = this.table("addresses");

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
    this.participants.hook("creating", function (primKey, obj, transaction) {
      if (!obj.userId) {
        obj.userId = nanoid();
      }
    });
  }
}

const db = new TravelPlannerDB();

export default db;
