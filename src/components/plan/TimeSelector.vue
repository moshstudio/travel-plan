<script setup lang="ts">
import { useStore } from "@/store";
import { formatDateTime } from "@/utils/datetime";
import { storeToRefs } from "pinia";
import { format, parse } from "date-fns";
import { PickerColumn, PickerOption } from "vant";
import {
  ref,
  reactive,
  computed,
  onMounted,
  triggerRef,
  onActivated,
  CSSProperties,
} from "vue";

const props = defineProps({
  label: {
    type: String,
    default: "到达时间",
  },
  labelStyle: {
    type: Object as () => CSSProperties,
    default: () => ({}),
  },
  modelValue: {
    type: Date,
    default: "",
  },
});

const emit = defineEmits(["update:modelValue"]);

// const duration = defineModel("duration", { type: Number, default: undefined });

const store = useStore();
const { currentTravel } = storeToRefs(store);

const pickerVal = ref(
  parseTimeToArray(currentTravel.value?.startDateTime || Date.now())
); //getTimeRange(0).start获取的就是一个我的默认显示的时间 ,你可以跟着你的业务来 ${year}-${month}-${date} 00:00
const showPicker = ref(false);

const columns = ref<PickerColumn[]>([]);
const quickSelectOptions = [
  {
    text: "现在",
    callback: () => {
      pickerVal.value = parseTimeToArray(Date.now());
    },
  },
  {
    text: "明天",
    callback: () => {
      const tomorrow8AM = new Date(
        new Date().setDate(new Date().getDate() + 1).valueOf()
      ).setHours(8, 0, 0, 0);
      pickerVal.value = parseTimeToArray(tomorrow8AM);
    },
  },
  {
    text: "0点",
    callback: () => {
      pickerVal.value = [
        pickerVal.value[0],
        pickerVal.value[1],
        pickerVal.value[2],
        0,
        0,
      ];
    },
  },
  {
    text: "8点",
    callback: () => {
      pickerVal.value = [
        pickerVal.value[0],
        pickerVal.value[1],
        pickerVal.value[2],
        8,
        0,
      ];
    },
  },
  {
    text: "12点",
    callback: () => {
      pickerVal.value = [
        pickerVal.value[0],
        pickerVal.value[1],
        pickerVal.value[2],
        12,
        0,
      ];
    },
  },
  {
    text: "20点",
    callback: () => {
      pickerVal.value = [
        pickerVal.value[0],
        pickerVal.value[1],
        pickerVal.value[2],
        20,
        0,
      ];
    },
  },
];

function init() {
  const date = props.modelValue;
  const Y = date.getFullYear();
  const M = date.getMonth(); // 0-based
  const D = date.getDate();
  const h = date.getHours();
  const m = date.getMinutes();
  // const s = date.getSeconds();
  pickerVal.value = [Y, M + 1, D, h, m];

  // 初始化列数据
  columns.value = [
    getYearColumns(Y),
    getMonthColumns(M),
    getDayColumns(Y, M + 1, D),
    getHourColumns(h),
    getMinuteColumns(m),
    // getSecondColumns(s),
  ];
}

// 获取年份列
function getYearColumns(currentYear: number) {
  const years = [];
  for (let i = currentYear - 10; i <= currentYear; i++) {
    years.push({ text: `${i}`, value: i });
  }
  return years;
}

// 获取月份列
function getMonthColumns(month: number) {
  const months = Array.from({ length: 12 }, (_, i) => ({
    text: i + 1 < 10 ? `0${i + 1}` : `${i + 1}`,
    value: i + 1,
  }));
  return months;
}

// 获取某年某月的天数
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

// 获取天数列
function getDayColumns(year: number, month: number, day: number) {
  const days = Array.from({ length: getDaysInMonth(year, month) }, (_, i) => ({
    text: i + 1 < 10 ? `0${i + 1}` : `${i + 1}`,
    value: i + 1,
  }));
  return days;
}

// 获取小时列
function getHourColumns(hour: number) {
  const hours = Array.from({ length: 24 }, (_, i) => ({
    text: i < 10 ? `0${i}` : `${i}`,
    value: i,
  }));
  return hours;
}

// 获取分钟列
function getMinuteColumns(minute: number) {
  const minutes = Array.from({ length: 60 }, (_, i) => ({
    text: i < 10 ? `0${i}` : `${i}`,
    value: i,
  }));
  return minutes;
}

// 获取秒列
function getSecondColumns(second: number) {
  const seconds = Array.from({ length: 60 }, (_, i) => ({
    text: i < 10 ? `0${i}` : `${i}`,
    value: i,
  }));
  return seconds;
}

function onChange({
  selectedValues,
  selectedOptions,
  selectedIndexes,
  columnIndex,
}: {
  selectedValues: number[];
  selectedOptions: PickerOption[];
  selectedIndexes: number[];
  columnIndex: number;
}) {
  if (columnIndex === 0 || columnIndex === 1) {
    // 年或月改变 → 更新天数
    const selectedYear = selectedValues[0];
    const selectedMonth = selectedValues[1];
    const selectedDay = selectedValues[2];

    const totalDays = getDaysInMonth(selectedYear, selectedMonth);
    const newDays = Array.from({ length: totalDays }, (_, i) => ({
      text: i + 1 < 10 ? `0${i + 1}` : `${i + 1}`,
      value: i + 1,
    }));

    columns.value[2] = newDays; // 更新第3列（天）
    if (selectedDay > totalDays) {
      let newVal = [...pickerVal.value];
      newVal[2] = totalDays - 1;
      pickerVal.value = newVal;
    }
  }
  // 提交最终值
  // submitTime();
}

// 提交时间
function submitTime() {
  const [year, month, day, hours, minutes] = pickerVal.value;
  emit("update:modelValue", new Date(year, month - 1, day, hours, minutes));
  showPicker.value = false;
}

function parseTimeToArray(timestamp: number): number[] {
  const date = new Date(timestamp);
  const formatted = format(date, "yyyy-MM-dd-HH-mm-ss");
  return formatted.split("-").map(Number);
}

const onShowPopup = () => {
  init();
  showPicker.value = true;
};

onMounted(() => {
  init();
});
</script>

<template>
  <div
    class="flex items-center gap-2 py-1 van-haptics-feedback"
    @click="onShowPopup"
  >
    <p
      class="text-[var(--van-text-color-2)] text-xs text-nowrap"
      :style="labelStyle"
    >
      {{ label }}
    </p>
    <div class="flex-grow flex items-center justify-end text-xs">
      {{ formatDateTime(modelValue.getTime(), "yyyy/MM/dd HH:mm") }}
    </div>
    <van-popup
      v-model:show="showPicker"
      position="bottom"
      teleport="body"
      round
    >
      <div class="w-full flex flex-col gap-2 items-center">
        <div class="w-full flex items-center justify-between">
          <p
            class="p-2 pb-0 van-haptics-feedback select-none cursor-pointer"
            @click="showPicker = false"
          >
            取消
          </p>
          <p
            class="p-2 pb-0 van-haptics-feedback select-none cursor-pointer text-blue-500"
            @click="submitTime"
          >
            确定
          </p>
        </div>
        <div
          class="w-full px-2 flex gap-2 overflow-x-auto overflow-y-hidden items-center justify-start"
        >
          <van-button
            v-for="(option, index) in quickSelectOptions"
            :key="index"
            round
            size="small"
            @click="option.callback()"
          >
            {{ option.text }}
          </van-button>
        </div>

        <van-picker
          v-model="pickerVal"
          :columns="columns"
          @change="onChange"
          option-height="44px"
          :show-toolbar="false"
          class="w-full px-1"
        />
      </div>
    </van-popup>
  </div>
</template>

<style scoped lang="less"></style>
