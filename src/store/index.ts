import _ from "lodash";
import { defineStore } from "pinia";
import { useStorage } from "@vueuse/core";
import { computed, ref } from "vue";
import { TravelPlan } from "@/data/TravelPlan";
import { Address } from "@/data/addrerss";
import { useNow } from "@vueuse/core";

export const useStore = defineStore("store", () => {
  const now = useNow({ interval: 1000 });
  const isDark = useStorage("isDark", false);

  const plans = useStorage<TravelPlan[]>("travelPlans", []);

  const plansBeforeToday = computed(() => {
    const nowTs = now.value.getTime();
    return plans.value.filter((plan) => {
      return plan.endTime < nowTs;
    });
  });
  const plansFromToday = computed(() => {
    const nowTs = now.value.getTime();
    return plans.value.filter((plan) => {
      return plan.endTime >= nowTs;
    });
  });

  const addTravelPlan = (plan: TravelPlan) => {
    plans.value.push(plan);
    refreshPlans();
  };

  const refreshPlans = () => {
    plans.value = _.sortBy(plans.value, ["startTime", "endTime"]);
  };

  const positionSelectAddress = ref<Address>();

  return {
    now,
    isDark,
    plans,
    plansBeforeToday,
    plansFromToday,
    positionSelectAddress,
    addTravelPlan,
    refreshPlans,
  };
});
