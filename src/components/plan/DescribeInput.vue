<script setup lang="ts">
import { sleep } from "@/utils";
import { CSSProperties, onActivated, ref, watch } from "vue";

const props = defineProps<{
  describe: string;
  onChange: (describe: string) => void;
  label: string;
  labelStyle?: CSSProperties;
  maxLength?: number;
  placeholder?: string;
}>();

const showDialog = ref(false);
const inputValue = ref(props.describe);
const inputField = ref<HTMLElement>();

watch(
  () => props.describe,
  (newVal) => {
    inputValue.value = newVal;
  }
);

const handleConfirm = () => {
  props.onChange(inputValue.value);
  showDialog.value = false;
};

const handleCancel = () => {
  inputValue.value = props.describe;
  showDialog.value = false;
};

const onFocus = async () => {
  await sleep(400);
  if (inputField.value) {
    inputField.value.focus();
  }
};
</script>

<template>
  <div
    class="flex py-1 items-center justify-start gap-2 van-haptics-feedback"
    @click="showDialog = true"
  >
    <p
      class="text-[var(--van-text-color-2)] text-xs text-nowrap shrink-0"
      :style="labelStyle"
    >
      {{ label }}
    </p>
    <div class="min-w-0 flex-grow flex items-center justify-end">
      <p class="text-[var(--van-text-color-1)] text-sm truncate">
        {{ describe }}
      </p>
    </div>
    <van-dialog
      teleport="body"
      v-model:show="showDialog"
      :title="label"
      show-cancel-button
      @confirm="handleConfirm"
      @cancel="handleCancel"
      @open="onFocus"
      class="rounded-lg"
    >
      <div class="p-4">
        <van-field
          ref="inputField"
          v-model="inputValue"
          type="textarea"
          autosize
          autofocus
          :maxlength="maxLength || 200"
          :placeholder="placeholder || '请输入'"
          class="border border-gray-300 rounded p-2 w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div
          v-if="maxLength"
          class="text-right text-sm text-gray-500 mt-1"
        >
          {{ inputValue.length }}/{{ maxLength }}
        </div>
      </div>
    </van-dialog>
  </div>
</template>

<style scoped lang="less">
/* 如果需要覆盖 Vant 组件样式，使用 :deep() */
:deep(.van-dialog__header) {
  font-size: 1.125rem;
  line-height: 1.75rem;
  font-weight: 600;
}

:deep(.van-dialog__content) {
  padding-top: 1rem;
  padding-bottom: 1rem;
}
</style>
