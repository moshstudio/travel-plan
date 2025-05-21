<template>
  <div
    class="w-screen h-screen flex flex-col overflow-hidden bg-[var(--van-background)]"
  >
    <van-nav-bar
      title="创建旅行"
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
          创建旅行
        </van-button>
      </van-cell-group>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";
import DateTimeRangePicker from "@/components/DateTimeRangePicker.vue";
import { useStore } from "@/store";
import router from "@/router";
import { TravelType } from "@/data/TravelPlan";

const store = useStore();
// 状态管理
const form = reactive({
  name: "",
  startDate: new Date(),
  endDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000),
  description: "",
});

// 提交逻辑
const submitTravel = () => {
  const travel: Omit<TravelType, "id" | "travelId"> = {
    name: form.name,
    description: form.description,
    startDateTime: form.startDate.getTime(),
    endDateTime: form.endDate.getTime(),
    createdAt: Date.now(),
  };
  store.createTravel(travel);
  router.replace({ name: "Travel" });
};
</script>

<style scoped></style>
