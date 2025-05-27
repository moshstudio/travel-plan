<script setup lang="ts">
import {
  ref,
  reactive,
  onMounted,
  computed,
  markRaw,
  toRaw,
  watch,
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
import { useRoute } from "vue-router";

const store = useStore();
const route = useRoute();
const { currentTravel } = storeToRefs(store);

// 获取要编辑的计划ID
const { travelPlanId } = defineProps({
  travelPlanId: String,
});
const plan = ref<TravelPlanType>();

const form = reactive({
  name: "",
  startDateTime: new Date(new Date().setHours(8, 0, 0, 0)),
  endDateTime: new Date(new Date().setHours(8, 0, 0, 0)),
  tags: [] as string[],
  isAllDay: false,
  notes: "",
  priority: "medium" as "low" | "medium" | "high",
  location: plan.value?.location,
});

// 加载已有计划数据
const loadPlanData = async () => {
  if (!travelPlanId) return;

  plan.value = store.getTravelPlanById(travelPlanId);
  if (!plan.value) {
    showFailToast("计划不存在");
    router.back();
    return;
  }
  form.name = plan.value.title;
  form.startDateTime = new Date(plan.value.startDateTime);
  form.endDateTime = new Date(plan.value.endDateTime);
  form.tags = plan.value.tags || [];
  form.priority = plan.value.priority;
  form.isAllDay = plan.value.isAllDay || false;
  form.notes = plan.value.description || "";
  form.location = plan.value.location;
};

// 提交表单 - 更新计划
const onSubmit = async () => {
  if (!form?.name || !form?.startDateTime || !form?.endDateTime) {
    showFailToast("请填写必填信息");
    return;
  }
  if (!form.location) {
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
  if (!plan.value) {
    showFailToast("计划不存在");
    return;
  }
  const planData: TravelPlanType = {
    id: plan.value.id,
    travelPlanId: plan.value.travelPlanId,
    travelId: currentTravel.value.travelId,
    title: form.name,
    description: form.notes,
    startDateTime: form.startDateTime.getTime(),
    endDateTime: form.endDateTime.getTime(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    status: TravelPlanStatus.planned,
    priority: form.priority,
    tags: toRaw(form.tags),
    location: toRaw(form.location),
    version: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  console.log(planData);

  try {
    await store.updateTravelPlan(planData);
    showSuccessToast("计划更新成功");
    back();
  } catch (error) {
    showFailToast("更新计划失败");
    console.error(error);
  }
};

const back = () => {
  router.back();
};

onActivated(async () => {
  await loadPlanData();
});
</script>

<template>
  <div
    v-if="!plan"
    class="w-screen h-screen flex flex-col items-center overflow-hidden bg-[var(--van-background)]"
  >
    <van-loading></van-loading>
  </div>
  <div
    v-else
    class="w-screen h-screen flex flex-col overflow-hidden bg-[var(--van-background)]"
  >
    <van-nav-bar
      title="编辑旅行计划"
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
          :value="form.location?.name || ''"
          clickable
          is-link
          @click="
            () =>
              $router.push({ name: 'PlanPosition', params: { travelPlanId } })
          "
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
          更新计划
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
