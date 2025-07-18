import _ from "lodash";
import { defineStore } from "pinia";
import { useStorage } from "@vueuse/core";
import { computed, onMounted, ref, toRaw, triggerRef, watch } from "vue";
import {
  TravelPlanStatus,
  TravelPlanType,
  TravelType,
} from "@/data/TravelPlan";
import { AddressType } from "@/data/address";
import { useNow } from "@vueuse/core";
import db, { KVType } from "./db";
import { liveQuery, Observable } from "dexie";
import { useObservable, from } from "@vueuse/rxjs";
import { switchMap } from "rxjs";
import { TravelExpenseType } from "@/data/expense";
import { TravelChecklistType } from "@/data/checklist";
import { useRoute } from "vue-router";
import { exitApp } from "tauri-plugin-commands";
import router from "@/router";

export const useStore = defineStore("store", () => {
  const nowRef = useNow({ interval: 1000 });

  /**旅行 */
  const currentTravel = useObservable<TravelType | undefined>(
    // 当前旅行
    from(
      liveQuery(async () => {
        return await db.currentTravel.limit(1).first();
      })
    )
  );

  const travels = useObservable<TravelType[]>(
    // 所有旅行
    from(
      liveQuery(async () => {
        return await db.travels.toArray();
      })
    )
  );
  const createTravel = async (travel: Omit<TravelType, "id" | "travelId">) => {
    // 创建旅行
    const ret = await db.travels.add(travel as TravelType);
    await db.currentTravel.clear();
    await db.currentTravel.add(travel as TravelType);
    return ret;
  };
  const switchTravel = async (travel: TravelType) => {
    // 切换旅行
    await db.currentTravel.clear();
    await db.currentTravel.add(toRaw(travel));
  };
  const getTravelById = (travelId: string) => {
    // 根据ID获取旅行
    return travels.value?.find((travel) => travel.travelId === travelId);
  };
  const updateTravel = async (travel: TravelType) => {
    // 更新旅行
    const ret = await db.travels.update(travel.id, toRaw(travel));
    if (currentTravel.value?.travelId === travel.travelId) {
      await db.currentTravel.update(currentTravel.value.id, toRaw(travel));
    }
    return ret;
  };
  const deleteTravel = async (travel: TravelType) => {
    // 删除旅行
    await db.travels.delete(travel.id);
    const planKeysToDelete = await db.travelPlans
      .where("travelId")
      .equals(travel.travelId)
      .primaryKeys();
    await db.travelPlans.bulkDelete(planKeysToDelete);

    const checklistKeysToDelete = await db.travelChecklists
      .where("travelId")
      .equals(travel.travelId)
      .primaryKeys();
    await db.travelChecklists.bulkDelete(checklistKeysToDelete);

    const expenseKeysToDelete = await db.travelExpenses
      .where("travelId")
      .equals(travel.travelId)
      .primaryKeys();
    await db.travelExpenses.bulkDelete(expenseKeysToDelete);

    if (travel.id === currentTravel.value?.id) {
      if (travels.value?.length) {
        await switchTravel(travels.value[0]);
      } else {
        await db.currentTravel.clear();
      }
    }
  };

  /**旅行计划 */
  const travelPlans = useObservable(
    // 当前旅行的计划
    from(currentTravel).pipe(
      switchMap((_) => {
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

  const travelPlansFromToday = computed(() => {
    // 今天之后的计划
    const today = new Date(nowRef.value).setHours(0, 0, 0, 0);
    return _.orderBy(
      travelPlans.value?.filter(
        (plan) => plan.startDateTime >= today || plan.endDateTime >= today
      ),
      ["startDateTime", "endDateTime"],
      ["asc", "asc"]
    );
  });
  const travelPlansBeforeToday = computed(() => {
    // 今天之前的计划
    const today = new Date(nowRef.value).setHours(0, 0, 0, 0);
    return _.orderBy(
      travelPlans.value?.filter(
        (plan) => !(plan.startDateTime >= today || plan.endDateTime >= today)
      ),
      ["startDateTime", "endDateTime"],
      ["asc", "asc"]
    );
  });
  const customTravelPlanTags = useObservable<string[]>(
    // 自定义旅行计划标签
    from(
      liveQuery(async () => {
        const kv = await db.kvs
          .where("key")
          .equals("customTravelPlanTags")
          .first();
        if (!kv) {
          return [];
        } else {
          return kv.value as string[];
        }
      })
    )
  );

  const updateCustomTravelPlanTags = async (tags: string[]) => {
    const kv = await db.kvs.where("key").equals("customTravelPlanTags").first();
    if (kv) {
      await db.kvs.update(kv.id, {
        value: tags,
      });
    } else {
      await db.kvs.add({
        key: "customTravelPlanTags",
        value: tags,
      } as KVType);
    }
  };

  onMounted(() => {
    // 定时检查状态并更新
    setInterval(() => {
      for (const plan of travelPlans.value || []) {
        if (["completed", "deleted", "cancelled"].includes(plan.status)) {
          return;
        }
        const oneDay = 24 * 60 * 60 * 1000; // 一天的毫秒数
        const nowTime = nowRef.value.getTime();
        if (
          nowTime >= plan.startDateTime - oneDay &&
          nowTime < plan.startDateTime
        ) {
          if (plan.status != TravelPlanStatus.upcoming) {
            plan.status = TravelPlanStatus.upcoming;
            updateTravelPlan(plan);
          }
        } else if (nowTime > plan.endDateTime) {
          if (plan.status != TravelPlanStatus.expired) {
            plan.status = TravelPlanStatus.expired;
            updateTravelPlan(plan);
          }
        } else if (
          nowTime >= plan.startDateTime &&
          nowTime <= plan.endDateTime
        ) {
          if (plan.status != TravelPlanStatus.inProgress) {
            plan.status = TravelPlanStatus.inProgress;
            updateTravelPlan(plan);
          }
        }
      }
    }, 1000);
  });

  const getTravelPlanById = (travelPlanId: string) => {
    // 根据ID获取旅行计划
    return travelPlans.value?.find(
      (plan) => plan.travelPlanId === travelPlanId
    );
  };
  const addTravelPlan = async (
    plan: Omit<TravelPlanType, "id" | "travelPlanId">
  ) => {
    // 添加旅行计划
    const ret = await db.travelPlans.add(plan as TravelPlanType);
    return await db.travelPlans.get(ret);
  };
  const updateTravelPlan = async (plan: TravelPlanType) => {
    // 更新旅行计划
    const ret = await db.travelPlans.update(plan.id, toRaw(plan));
    return ret;
  };
  const deleteTravelPlan = async (plan: TravelPlanType) => {
    // 删除旅行计划
    const ret = await db.travelPlans.delete(plan.id);
    return ret;
  };

  /**旅行清单 */
  const travelChecklists = useObservable(
    // 当前旅行的清单
    from(currentTravel).pipe(
      switchMap((_) => {
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
  const getChecklistItem = (itemId: string) => {
    // 获取清单
    return travelChecklists.value?.find((item) => item.itemId === itemId);
  };
  const addChecklistItem = async (
    item: Omit<TravelChecklistType, "id" | "itemId">
  ) => {
    // 添加清单
    const ret = await db.travelChecklists.add(item as TravelChecklistType);
    return ret;
  };

  const updateTravelChecklist = async (item: TravelChecklistType) => {
    // 更新清单
    const ret = await db.travelChecklists.update(item.id, toRaw(item));
    return ret;
  };
  const deleteTravelChecklist = async (item: TravelChecklistType) => {
    // 删除清单
    const ret = await db.travelChecklists.delete(item.id);
    return ret;
  };
  const customTravelChecklistTags = useObservable<string[]>(
    // 自定义清单标签
    from(
      liveQuery(async () => {
        const kv = await db.kvs
          .where("key")
          .equals("customTravelChecklistTags")
          .first();
        if (!kv) {
          return [];
        } else {
          return kv.value as string[];
        }
      })
    )
  );

  const updateCustomTravelChecklistTags = async (tags: string[]) => {
    const kv = await db.kvs
      .where("key")
      .equals("customTravelChecklistTags")
      .first();
    if (kv) {
      await db.kvs.update(kv.id, {
        value: tags,
      });
    } else {
      await db.kvs.add({
        key: "customTravelChecklistTags",
        value: tags,
      } as KVType);
    }
  };

  /**旅行花费 */
  const travelExpenses = useObservable(
    // 当前旅行的清单
    from(currentTravel).pipe(
      switchMap((_) => {
        return from(
          liveQuery(async () => {
            if (!currentTravel.value) return [];
            return await db.travelExpenses
              .where("travelId")
              .equals(currentTravel.value.travelId)
              .toArray();
          })
        );
      })
    )
  );
  const getTravelExpenseById = (expenseId: string) => {
    return travelExpenses.value?.find((e) => e.expenseId === expenseId);
  };
  const addTravelExpense = async (
    expense: Omit<TravelExpenseType, "id" | "expenseId">
  ) => {
    // 添加花费
    const ret = await db.travelExpenses.add(expense as TravelExpenseType);
    return await db.travelExpenses.get(ret);
  };
  const updateTravelExpense = async (expense: TravelExpenseType) => {
    // 更新花费
    const ret = await db.travelExpenses.update(expense.id, expense);
    return ret;
  };
  const deleteTravelExpense = async (expense: TravelExpenseType) => {
    // 删除花费
    const ret = await db.travelExpenses.delete(expense.id);
    return ret;
  };

  const backCallbacks: Record<string, Function[]> = {};
  const addBackCallback = (pathName: string, cb: Function) => {
    backCallbacks[pathName] = backCallbacks[pathName] || [];
    if (backCallbacks[pathName].includes(cb)) {
      return;
    }
    backCallbacks[pathName].push(cb);
  };
  const removeBackCallback = (pathName: string, cb: Function) => {
    if (!backCallbacks[pathName]) {
      return;
    }
    _.remove(backCallbacks[pathName], (item) => item === cb);
  };
  const triggerBackCallbacks = async (pathName: string) => {
    if (!backCallbacks[pathName]) {
      return;
    }

    for (const callback of backCallbacks[pathName]) {
      try {
        await Promise.resolve(callback());
      } catch (error) {
        console.error(`Error executing callback for ${pathName}:`, error);
      }
    }
  };

  onMounted(async () => {
    const route = useRoute();
    addBackCallback("Travel", async () => {
      //退出
      await exitApp();
    });
    addBackCallback("CreateTravel", async () => {
      router.push({ name: "Travel" });
    });
    addBackCallback("EditTravel", async () => {
      router.push({ name: "Travel" });
    });
    addBackCallback("PlanMap", async () => {
      router.push({ name: "Travel" });
    });
    addBackCallback("ExpenseMap", async () => {
      router.push({ name: "Travel" });
    });
    addBackCallback("ShareRoad", async () => {
      router.push({ name: "Travel" });
    });

    window.androidBackCallback = async () => {
      const path = route.name?.toString();
      if (path) {
        await triggerBackCallbacks(path);
      }
    };
  });

  return {
    now: nowRef,

    currentTravel,
    travels,
    createTravel,
    switchTravel,
    getTravelById,
    updateTravel,
    deleteTravel,

    travelPlans,
    travelPlansFromToday,
    travelPlansBeforeToday,
    customTravelPlanTags,
    getTravelPlanById,
    addTravelPlan,
    updateTravelPlan,
    deleteTravelPlan,
    updateCustomTravelPlanTags,

    travelChecklists,
    customTravelChecklistTags,
    getChecklistItem,
    addChecklistItem,
    updateTravelChecklist,
    deleteTravelChecklist,
    updateCustomTravelChecklistTags,

    travelExpenses,
    getTravelExpenseById,
    addTravelExpense,
    updateTravelExpense,
    deleteTravelExpense,

    addBackCallback,
    removeBackCallback,
    triggerBackCallbacks,
  };
});
