import _ from "lodash";
import { defineStore } from "pinia";
import { useStorage } from "@vueuse/core";
import { computed, ref } from "vue";
import { TravelPlanType, TravelType } from "@/data/TravelPlan";
import { AddressType } from "@/data/address";
import { useNow } from "@vueuse/core";
import db from "./db";
import { ParticipantType } from "@/data/participants";
import { liveQuery, Observable } from "dexie";
import { useObservable, from } from "@vueuse/rxjs";

export const useStore = defineStore("store", () => {
  const now = useNow({ interval: 1000 });
  const isDark = useStorage("isDark", false);
  const positionSelectAddress = ref<AddressType>();

  const currentTravel = useStorage<TravelType | undefined>(
    "currentTravel",
    undefined
  );
  const travelPlans = useObservable(
    from(liveQuery(() => db.travelPlans.toArray()))
  );

  return {
    now,
    isDark,
    positionSelectAddress,
  };
});

export const useTravelPlanStore = defineStore("travelPlan", () => {
  // Create
  async function createTravel(travel: Omit<TravelType, "id">): Promise<number> {
    return db.travels.add(travel as TravelType);
  }

  // Read
  async function getTravel(id: number): Promise<TravelType | undefined> {
    return db.travels.get(id);
  }

  async function getAllTravels(): Promise<TravelType[]> {
    return db.travels.toArray();
  }

  // Update
  async function updateTravel(
    id: number,
    changes: Partial<TravelType>
  ): Promise<number> {
    return db.travels.update(id, changes);
  }

  // Delete
  async function deleteTravel(id: number): Promise<void> {
    // First delete all related travel plans
    await db.travelPlans.where("travelId").equals(id).delete();
    return db.travels.delete(id);
  }

  // Create
  async function createTravelPlan(
    plan: Omit<TravelPlanType, "id">
  ): Promise<number> {
    return db.travelPlans.add(plan as TravelPlanType);
  }

  // Read
  async function getTravelPlan(
    id: number
  ): Promise<TravelPlanType | undefined> {
    return db.travelPlans.get(id);
  }

  async function getPlansByTravelId(
    travelId: number
  ): Promise<TravelPlanType[]> {
    return db.travelPlans.where("travelId").equals(travelId).toArray();
  }

  async function getPlansByDateRange(
    start: number,
    end: number
  ): Promise<TravelPlanType[]> {
    return db.travelPlans
      .where("startDateTime")
      .between(start, end)
      .or("endDateTime")
      .between(start, end)
      .toArray();
  }

  // Update
  async function updateTravelPlan(
    id: number,
    changes: Partial<TravelPlanType>
  ): Promise<number> {
    changes.updatedAt = Date.now();
    changes.version = (changes.version || 0) + 1;
    return db.travelPlans.update(id, changes);
  }

  // Delete
  async function deleteTravelPlan(id: number): Promise<void> {
    return db.travelPlans.delete(id);
  }

  // Create or Update
  async function upsertParticipant(
    participant: ParticipantType
  ): Promise<string> {
    return db.participants.put(participant);
  }

  // Read
  async function getParticipant(
    userId: string
  ): Promise<ParticipantType | undefined> {
    return db.participants.get(userId);
  }

  async function getParticipantsByPlan(
    planId: number
  ): Promise<ParticipantType[]> {
    const plan = await db.travelPlans.get(planId);
    if (!plan || !plan.participants) return [];

    return db.participants
      .where("userId")
      .anyOf(plan.participants.map((p) => p.userId))
      .toArray();
  }

  // Delete
  async function deleteParticipant(userId: string): Promise<void> {
    return db.participants.delete(userId);
  }

  // Create
  async function createAddress(
    address: Omit<AddressType, "id">
  ): Promise<number> {
    return db.addresses.add(address as AddressType);
  }

  // Read
  async function getAddress(id: number): Promise<AddressType | undefined> {
    return db.addresses.get(id);
  }

  async function searchAddresses(query: string): Promise<AddressType[]> {
    return db.addresses
      .where("name")
      .startsWithIgnoreCase(query)
      .or("address")
      .startsWithIgnoreCase(query)
      .toArray();
  }

  // Update
  async function updateAddress(
    id: number,
    changes: Partial<AddressType>
  ): Promise<number> {
    return db.addresses.update(id, changes);
  }

  // Delete
  async function deleteAddress(id: number): Promise<void> {
    return db.addresses.delete(id);
  }
});
