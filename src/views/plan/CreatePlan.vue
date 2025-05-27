<script setup lang="ts">
import {
  ref,
  reactive,
  onMounted,
  computed,
  markRaw,
  toRaw,
  onActivated,
} from "vue";
import { useStore } from "@/store";
import { showFailToast, showSuccessToast } from "vant";
import { getCurrentLngLat, getLngLatAddress } from "@/api/tdt.ts";
import router from "@/router";
import { storeToRefs } from "pinia";
import { TravelPlanStatus, TravelPlanType } from "@/data/TravelPlan";
import PrioritySelector from "@/components/PrioritySelector.vue";
import DateTimeRangePicker from "@/components/DateTimeRangePicker.vue";
import TravelTagSelector from "@/components/TravelTagSelector.vue";

const store = useStore();
const { currentTravel } = storeToRefs(store);

// 表单数据
const form = reactive({
  name: "",
  startDateTime: new Date(new Date().setHours(8, 0, 0, 0)),
  endDateTime: new Date(new Date().setHours(8, 0, 0, 0)),
  tags: [] as string[],
  isAllDay: false,
  notes: "",
  priority: "medium" as "low" | "medium" | "high",
});

// 提交表单
const onSubmit = async () => {
  if (!form.name || !form.startDateTime || !form.endDateTime) {
    showFailToast("请填写必填信息");
    return;
  }
  if (!store.planSelectAddress) {
    showFailToast("请选择目的地");
    return;
  }

  if (form.startDateTime > form.endDateTime) {
    showFailToast("结束时间必须晚于开始时间");
    return;
  }
  if (!currentTravel.value) {
    showFailToast("请先创建旅行");
    router.push({ name: "CreateTravel" });
    return;
  }

  // 这里可以调用store的action来保存计划
  const planData: Omit<TravelPlanType, "id" | "travelPlanId"> = {
    travelId: currentTravel.value.travelId,
    title: form.name,
    description: form.notes,
    startDateTime: form.startDateTime.getTime(),
    endDateTime: form.endDateTime.getTime(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    status: TravelPlanStatus.planned,
    priority: form.priority,
    tags: toRaw(form.tags),
    location: toRaw(store.planSelectAddress),
    version: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  console.log(planData);

  await store.addTravelPlan(planData);
  showSuccessToast("计划创建成功");
  store.planSelectAddress = undefined;
  back();
};

const back = () => {
  router.push({ name: "Travel" });
};

onActivated(async () => {
  if (!store.planSelectAddress) {
    const lonlat = await getCurrentLngLat();
    if (lonlat) {
      const address = await getLngLatAddress(lonlat);
      store.planSelectAddress = {
        name: address,
        coordinates: {
          lng: lonlat.lng,
          lat: lonlat.lat,
        },
      };
    }
  }
});
</script>

<template>
  <div
    class="w-screen h-screen flex flex-col overflow-hidden bg-[var(--van-background)]"
  >
    <van-nav-bar
      title="添加旅行计划"
      left-arrow
      @click-left="back"
    />

    <div class="flex-grow w-full h-full p-2 overflow-auto">
      <van-cell-group inset>
        <van-field
          v-model="form.name"
          label="计划名称"
          placeholder="请输入计划名称"
          clearable
          required
        />
        <DateTimeRangePicker
          v-model:start-date-time="form.startDateTime"
          v-model:end-date-time="form.endDateTime"
          :time-selectable="true"
        />
        <PrioritySelector v-model="form.priority" />
        <TravelTagSelector
          :tags="form.tags"
          :custom-tags="store.customTravelPlanTags"
          @update:tags="(tags) => (form.tags = tags)"
          @update:custom-tags="(tags) => store.updateCustomTravelPlanTags(tags)"
        ></TravelTagSelector>
        <van-cell
          title="目的地"
          :value="store.planSelectAddress?.name || ''"
          clickable
          is-link
          @click="() => $router.push({ name: 'PlanPosition' })"
        />
        <van-field
          v-model="form.notes"
          rows="3"
          autosize
          label="备注"
          type="textarea"
          placeholder="请输入备注信息"
          show-word-limit
          maxlength="200"
        />
      </van-cell-group>

      <!-- 提交按钮 -->
      <div class="p-4">
        <van-button
          round
          block
          type="primary"
          class="bg-blue-500"
          @click="onSubmit"
        >
          创建计划
        </van-button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
:deep(.van-cell__title) {
  flex: none;
}
:deep(.van-dropdown-menu__bar) {
  box-shadow: none;
}
:deep(.van-dropdown-item__content) {
  max-height: 200px;
}
</style>
