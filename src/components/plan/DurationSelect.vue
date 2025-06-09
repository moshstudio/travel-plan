<script setup lang="ts">
import { ref } from "vue";

const predictDuration = defineModel<number>("duration", { required: true });
const { startDateTime } = defineProps<{
  startDateTime: Date;
}>();

const showQuickDialog = ref(false);

// 快捷选择选项
const quickOptions = [
  {
    text: "1小时",
    callback: () => {
      predictDuration.value = 1;
      showQuickDialog.value = false;
    },
  },
  {
    text: "2小时",
    callback: () => {
      predictDuration.value = 2;
      showQuickDialog.value = false;
    },
  },
  {
    text: "4小时",
    callback: () => {
      predictDuration.value = 4;
      showQuickDialog.value = false;
    },
  },
  {
    text: "8小时",
    callback: () => {
      predictDuration.value = 8;
      showQuickDialog.value = false;
    },
  },
  {
    text: "当天结束",
    callback: () => {
      predictDuration.value = Number(
        (
          (new Date(startDateTime.getTime() + 86400000).setHours(0, 0, 0, 0) -
            startDateTime.getTime()) /
          1000 /
          60 /
          60
        ).toFixed(1)
      );
      showQuickDialog.value = false;
    },
  },
  {
    text: "次日8点",
    callback: () => {
      predictDuration.value = Number(
        (
          (new Date(startDateTime.getTime() + 86400000).setHours(0, 0, 0, 0) -
            startDateTime.getTime() +
            8 * 60 * 60 * 1000) /
          1000 /
          60 /
          60
        ).toFixed(1)
      );
      showQuickDialog.value = false;
    },
  },
];
</script>

<template>
  <div class="flex items-center justify-start gap-2">
    <p class="text-[var(--van-text-color-2)] text-xs text-nowrap">
      预计用时(H)
    </p>
    <div class="flex-grow flex items-center justify-end w-full gap-2">
      <van-stepper
        v-model="predictDuration"
        :min="0"
        :max="124"
        :step="0.5"
        input-width="40px"
        button-size="20px"
      />
      <van-icon
        name="ellipsis"
        class="w-[15px] van-haptics-feedback"
        @click="showQuickDialog = true"
      ></van-icon>
    </div>

    <van-dialog
      teleport="body"
      v-model:show="showQuickDialog"
      title="预计用时(H)"
      show-cancel-button
      cancel-button-text="取消"
      :show-confirm-button="false"
      close-on-click-overlay
    >
      <van-list>
        <van-cell
          v-for="(option, index) in quickOptions"
          :key="index"
          center
          clickable
          @click="option.callback()"
        >
          <template #title>
            <div class="text-center">{{ option.text }}</div>
          </template>
        </van-cell>
      </van-list>
    </van-dialog>
  </div>
</template>

<style scoped lang="less"></style>
