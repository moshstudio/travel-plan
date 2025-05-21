import { ParticipantType } from "@/data/participants";
import { TravelPlanType, TravelType } from "@/data/TravelPlan";
import Dexie from "dexie";
import { nanoid } from "nanoid";

class TravelPlannerDB extends Dexie {
  currentTravel: Dexie.Table<TravelType, number>;
  travels: Dexie.Table<TravelType, number>;
  travelPlans: Dexie.Table<TravelPlanType, number>;
  travelChecklists: Dexie.Table<TravelChecklistType, number>;
  participants: Dexie.Table<ParticipantType, number>;

  constructor() {
    super("TravelPlannerDB");

    this.version(1).stores({
      currentTravel:
        "++id, travelId, name, startDateTime, endDateTime, createdAt",
      travels: "++id, travelId, name, startDateTime, endDateTime, createdAt",
      travelPlans:
        "++id, travelPlanId, travelId, title, description, tags, startDateTime, endDateTime, isAllDay, timezone, location, status, priority, budget, attachments, participants, createdAt, updatedAt, createdBy, version, recurrence",
      travelChecklists:
        "++id, itemId, travelId, name, category, isPacked, quantity, importance, notes, createdAt, updatedAt",
      participants: "++id, userId, name, defaultRole",
    });

    this.currentTravel = this.table("currentTravel");
    this.travels = this.table("travels");
    this.travelPlans = this.table("travelPlans");
    this.travelChecklists = this.table("travelChecklists");
    this.participants = this.table("participants");

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
    this.participants.hook("creating", function (primKey, obj, transaction) {
      if (!obj.userId) {
        obj.userId = nanoid();
      }
    });
  }
}

const db = new TravelPlannerDB();

export default db;
