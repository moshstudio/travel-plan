<template>
  <div
    class="w-screen h-screen flex flex-col overflow-hidden bg-[var(--van-background)]"
  >
    <van-nav-bar
      title="编辑旅行"
      left-arrow
      @click-left="$router.back()"
    />
    <!-- Vant导航栏 -->
    <div class="flex-grow w-full h-full p-2 overflow-auto">
      <van-cell-group insert>
        <!-- 旅行名称 -->
        <van-field
          v-model="form.name"
          name="travelName"
          label="旅行名称"
          required
          placeholder="请输入旅行名称"
          class="mb-4"
        />
        <DateTimeRangePicker
          v-model:start-date-time="form.startDate"
          v-model:end-date-time="form.endDate"
          :time-selectable="false"
        />

        <!-- 旅行描述 -->
        <van-field
          v-model="form.description"
          name="description"
          label="旅行描述"
          type="textarea"
          rows="3"
          placeholder="请输入旅行描述"
          class="mb-4"
        />

        <van-button
          type="primary"
          native-type="submit"
          block
          @click="submitTravel"
        >
          保存修改
        </van-button>
      </van-cell-group>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, onMounted, onActivated, ref } from "vue";
import { useRoute } from "vue-router";
import DateTimeRangePicker from "@/components/DateTimeRangePicker.vue";
import { useStore } from "@/store";
import router from "@/router";
import { TravelType } from "@/data/TravelPlan";

const store = useStore();
const route = useRoute();

// 获取travelId
const travelId = ref<string>();
const travel = ref<TravelType>();

// 初始化表单
const form = reactive({
  name: "",
  startDate: new Date(),
  endDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
  description: "",
});

// 加载旅行数据的函数
const loadTravelData = () => {
  travelId.value = route.params.travelId as string;
  travel.value = store.getTravelById(travelId.value);
  if (travel.value) {
    form.name = travel.value.name;
    form.description = travel.value.description || "";
    form.startDate = travel.value.startDateTime
      ? new Date(travel.value.startDateTime)
      : new Date();
    form.endDate = travel.value.endDateTime
      ? new Date(travel.value.endDateTime)
      : new Date(Date.now() + 1 * 24 * 60 * 60 * 1000);
  }
};

// 组件挂载时加载数据
onMounted(loadTravelData);

// 组件激活时重新加载数据（用于keep-alive场景）
onActivated(loadTravelData);

// 提交逻辑
const submitTravel = async () => {
  if (!travel.value) {
    console.error("旅行不存在");
    return;
  }
  const travelData: TravelType = {
    id: travel.value.id,
    travelId: travel.value.travelId, // 保留原始travelId
    name: form.name,
    description: form.description,
    startDateTime: form.startDate.getTime(),
    endDateTime: form.endDate.getTime(),
    createdAt: Date.now(), // 更新创建时间为当前时间（或可以保留原始时间）
  };
  await store.updateTravel(travelData);
  router.back();
};
</script>

<style scoped></style>
