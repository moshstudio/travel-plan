import _ from "lodash";
import { defineStore } from "pinia";
import { useStorage } from "@vueuse/core";
import { computed, ref, toRaw, triggerRef, watch } from "vue";
import { TravelPlanType, TravelType } from "@/data/TravelPlan";
import { AddressType } from "@/data/address";
import { useNow } from "@vueuse/core";
import db from "./db";
import { liveQuery, Observable } from "dexie";
import { useObservable, from, useExtractedObservable } from "@vueuse/rxjs";
import { debounceTime, distinctUntilChanged, switchMap } from "rxjs";

export const useStore = defineStore("store", () => {
  const nowRef = useNow({ interval: 1000 });
  const isDark = useStorage("isDark", false);
  const positionSelectAddress = ref<Omit<AddressType, "id">>();

  const currentTravel = useObservable<TravelType>(
    from(
      liveQuery(async () => {
        return (await db.table("currentTravel").toArray())[0];
      })
    )
  );

  const travels = useObservable<TravelType[]>(
    from(
      liveQuery(async () => {
        return await db.table("travels").toArray();
      })
    )
  );

  const travelPlans = useObservable(
    from(currentTravel).pipe(
      switchMap((query) => {
        return from(
          liveQuery(async () => {
            if (!currentTravel.value) return [];
            return await db.travelPlans
              .where("travelId")
              .equals(currentTravel.value.travelId)
              .filter((plan) => plan.status !== "deleted")
              .toArray();
          })
        );
      })
    )
  );

  const travelChecklists = useObservable(
    from(currentTravel).pipe(
      switchMap((query) => {
        return from(
          liveQuery(async () => {
            if (!currentTravel.value) return [];
            return await db.travelChecklists
              .where("travelId")
              .equals(currentTravel.value.travelId)
              .toArray();
          })
        );
      })
    )
  );

  const travelPlansFromToday = computed(() => {
    const today = new Date(nowRef.value).setHours(0, 0, 0, 0);
    return _.orderBy(
      travelPlans.value?.filter((plan) => plan.endDateTime >= today),
      ["startDateTime", "endDateTime"],
      ["asc", "asc"]
    );
  });
  const travelPlansBeforeToday = computed(() => {
    const today = new Date(nowRef.value).setHours(0, 0, 0, 0);
    return travelPlans.value?.filter((plan) => plan.endDateTime < today);
  });

  const createTravel = async (travel: Omit<TravelType, "id" | "travelId">) => {
    const ret = await db.travels.add(travel as TravelType);
    await db.currentTravel.clear();
    await db.currentTravel.add(travel as TravelType);
    return ret;
  };
  const switchTravel = async (travel: TravelType) => {
    await db.currentTravel.clear();
    await db.currentTravel.add(toRaw(travel));
  };
  const getTravelPlanById = (travelPlanId: string) => {
    return travelPlans.value?.find(
      (plan) => plan.travelPlanId === travelPlanId
    );
  };
  const addTravelPlan = async (
    plan: Omit<TravelPlanType, "id" | "travelPlanId">
  ) => {
    const ret = await db.travelPlans.add(plan as TravelPlanType);
    return ret;
  };
  const updateTravelPlan = async (plan: TravelPlanType) => {
    const ret = await db.travelPlans.update(plan.id, toRaw(plan));
    return ret;
  };
  const deleteTravelPlan = async (plan: TravelPlanType) => {
    const ret = await db.travelPlans.delete(plan.id);
    return ret;
  };

  const getChecklistItem = (itemId: string) => {
    return travelChecklists.value?.find((item) => item.itemId === itemId);
  };
  const addChecklistItem = async (
    item: Omit<TravelChecklistType, "id" | "itemId">
  ) => {
    const ret = await db.travelChecklists.add(item as TravelChecklistType);
    return ret;
  };

  const updateTravelChecklist = async (item: TravelChecklistType) => {
    const ret = await db.travelChecklists.update(item.id, toRaw(item));
    return ret;
  };
  const deleteTravelChecklist = async (item: TravelChecklistType) => {
    const ret = await db.travelChecklists.delete(item.id);
    return ret;
  };

  return {
    now: nowRef,
    isDark,
    positionSelectAddress,
    currentTravel,

    travels,
    travelPlans,
    travelChecklists,
    travelPlansFromToday,
    travelPlansBeforeToday,

    createTravel,
    switchTravel,

    getTravelPlanById,
    addTravelPlan,
    updateTravelPlan,
    deleteTravelPlan,

    getChecklistItem,
    addChecklistItem,
    updateTravelChecklist,
    deleteTravelChecklist,
  };
});
