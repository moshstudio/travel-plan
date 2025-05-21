<template>
  <div>
    <!-- 触发按钮 -->
    <van-cell
      center
      title="时间范围"
      :value="displayValue"
      :border="false"
      is-link
      @click="showPopup = true"
    >
      <template #value>
        <div class="flex flex-col items-end">
          <div class="flex items-baseline space-x-1">
            <div class="flex items-baseline">
              <span class="text-base font-semibold text-gray-800">
                {{ displayStartDate }}
              </span>
              <span
                v-if="displayStartTime"
                class="ml-1 text-sm text-gray-500"
              >
                {{ displayStartTime }}
              </span>
            </div>
            <span class="text-sm text-gray-400">—</span>
            <div class="flex items-baseline">
              <span class="text-base font-semibold text-gray-800">
                {{ displayEndDate }}
              </span>
              <span
                v-if="displayEndTime"
                class="ml-1 text-sm text-gray-500"
              >
                {{ displayEndTime }}
              </span>
            </div>
          </div>
        </div>
      </template>
    </van-cell>

    <!-- 弹出层 -->
    <van-popup
      v-model:show="showPopup"
      position="bottom"
      round
      :style="{ height: '70%' }"
    >
      <div class="h-full flex flex-col">
        <!-- 头部 -->
        <div
          class="flex justify-between items-center p-3 border-b border-gray-100"
        >
          <h3 class="font-medium text-gray-900 text-sm">选择时间范围</h3>
          <span
            class="text-blue-500 font-medium text-sm"
            @click="confirmSelection"
            >确定</span
          >
        </div>

        <!-- 内容区域 -->
        <div class="flex-1 overflow-hidden">
          <!-- 日期选择 -->
          <div
            v-show="!showTimePicker"
            class="h-full overflow-y-auto p-3"
          >
            <!-- 月份导航 -->
            <div class="flex justify-between items-center mb-3">
              <van-icon
                name="arrow-left"
                size="14"
                @click="prevMonth"
              />
              <span class="font-medium text-sm text-gray-900">{{
                currentMonthText
              }}</span>
              <van-icon
                name="arrow"
                size="14"
                @click="nextMonth"
              />
            </div>

            <!-- 快捷选择 -->
            <div class="flex space-x-2 mb-3 overflow-x-auto pb-1">
              <button
                v-for="(item, index) in quickRanges"
                :key="index"
                class="flex-shrink-0 px-2.5 py-1 text-xs rounded-full border"
                :class="{
                  'bg-blue-500 text-white border-blue-500':
                    quickRangeActive === index,
                  'border-gray-200 text-gray-700': quickRangeActive !== index,
                }"
                @click="selectQuickRange(index)"
              >
                {{ item.label }}
              </button>
            </div>

            <!-- 日历 -->
            <div class="mb-3">
              <div class="grid grid-cols-7 gap-1 text-center">
                <div
                  v-for="day in weekDays"
                  :key="day"
                  class="text-xs text-gray-500 py-1"
                >
                  {{ day }}
                </div>
                <div
                  v-for="(date, index) in calendarDates"
                  :key="index"
                  class="py-0.5 relative"
                  @click="selectDate(date)"
                >
                  <div
                    v-if="isInRange(date)"
                    class="absolute inset-0 bg-blue-100/50"
                    :class="{
                      'rounded-l-full': isRangeStart(date),
                      'rounded-r-full': isRangeEnd(date),
                    }"
                  ></div>
                  <div
                    class="w-7 h-7 mx-auto flex items-center justify-center rounded-full text-xs relative z-10"
                    :class="getDateClass(date)"
                  >
                    {{ date.getDate() }}
                  </div>
                </div>
              </div>
            </div>

            <!-- 日期时间显示 -->
            <div class="flex flex-col space-y-2 p-2 bg-gray-50 rounded-lg">
              <div class="flex justify-between">
                <div class="text-center">
                  <div class="text-xs text-gray-500">开始日期</div>
                  <div class="text-sm font-medium text-blue-500">
                    {{ startDateTime ? formatDate(startDateTime) : "--" }}
                  </div>
                </div>
                <div class="text-center">
                  <div class="text-xs text-gray-500">结束日期</div>
                  <div class="text-sm font-medium text-blue-500">
                    {{ endDateTime ? formatDate(endDateTime) : "--" }}
                  </div>
                </div>
              </div>
              <div
                v-if="timeSelectable"
                class="flex justify-between"
              >
                <div class="text-center">
                  <div class="text-xs text-gray-500">开始时间</div>
                  <div class="text-sm font-medium text-blue-500">
                    {{
                      startDateTime ? extractTimeFromDate(startDateTime) : "--"
                    }}
                  </div>
                </div>
                <div class="text-center">
                  <div class="text-xs text-gray-500">结束时间</div>
                  <div class="text-sm font-medium text-blue-500">
                    {{ endDateTime ? extractTimeFromDate(endDateTime) : "--" }}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 时间选择 -->
          <div
            v-show="showTimePicker"
            class="h-full overflow-y-auto p-3"
          >
            <div class="mb-4">
              <div class="text-sm font-medium text-gray-900 mb-1">开始时间</div>
              <div class="grid grid-cols-4 gap-1.5">
                <button
                  v-for="time in simplifiedTimeOptions"
                  :key="'start-' + time"
                  class="py-1.5 rounded text-xs"
                  :class="
                    startDateTime && extractTimeFromDate(startDateTime) === time
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-800'
                  "
                  @click="setTime('start', time)"
                >
                  {{ time }}
                </button>
              </div>
            </div>

            <div>
              <div class="text-sm font-medium text-gray-900 mb-1">结束时间</div>
              <div class="grid grid-cols-4 gap-1.5">
                <button
                  v-for="time in simplifiedTimeOptions"
                  :key="'end-' + time"
                  class="py-1.5 rounded text-xs"
                  :class="
                    endDateTime && extractTimeFromDate(endDateTime) === time
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-800'
                  "
                  @click="setTime('end', time)"
                >
                  {{ time }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- 底部切换按钮 -->
        <div
          v-if="timeSelectable"
          class="p-2 border-t border-gray-100 flex justify-center"
        >
          <button
            class="px-4 py-1.5 bg-blue-500 text-white rounded-full text-xs"
            @click="showTimePicker = !showTimePicker"
          >
            {{ showTimePicker ? "选择日期" : "选择时间" }}
          </button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script lang="ts" setup>
import { ref, computed } from "vue";
import {
  format,
  addDays,
  addMonths,
  isSameDay,
  isSameMonth,
  isWithinInterval,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  isAfter,
  setHours,
  setMinutes,
  getHours,
  getMinutes,
} from "date-fns";
import { showToast } from "vant";

interface Props {
  timeSelectable?: boolean;
  startDateTime?: Date | null;
  endDateTime?: Date | null;
}

const props = withDefaults(defineProps<Props>(), {
  timeSelectable: true,
  startDateTime: null,
  endDateTime: null,
});

const emit = defineEmits<{
  (e: "update:startDateTime", value: Date | null): void;
  (e: "update:endDateTime", value: Date | null): void;
  (
    e: "change",
    value: { startDateTime: Date | null; endDateTime: Date | null }
  ): void;
}>();

const showPopup = ref(false);
const showTimePicker = ref(false);
const quickRangeActive = ref<number | null>(null);
const currentMonth = ref<Date>(new Date());

const weekDays = ["日", "一", "二", "三", "四", "五", "六"];
const quickRanges = [
  { label: "今天", days: 0 },
  { label: "近7天", days: 6 },
  { label: "近30天", days: 29 },
];
const simplifiedTimeOptions = Array.from(
  { length: 24 },
  (_, i) => `${i.toString().padStart(2, "0")}:00`
);

// 计算属性
const currentMonthText = computed(() =>
  format(currentMonth.value, "yyyy年MM月")
);
const calendarDates = computed(() => {
  const monthStart = startOfMonth(currentMonth.value);
  const monthEnd = endOfMonth(currentMonth.value);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 });
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const dates: Date[] = [];
  let current = startDate;

  while (current <= endDate) {
    dates.push(new Date(current));
    current = addDays(current, 1);
  }

  return dates;
});

const displayValue = computed(() =>
  !props.startDateTime || !props.endDateTime ? "请选择" : ""
);
const displayStartDate = computed(() =>
  props.startDateTime ? format(props.startDateTime, "MM/dd") : "--"
);
const displayEndDate = computed(() =>
  props.endDateTime ? format(props.endDateTime, "MM/dd") : "--"
);
const displayStartTime = computed(() =>
  props.timeSelectable && props.startDateTime
    ? extractTimeFromDate(props.startDateTime)
    : ""
);
const displayEndTime = computed(() =>
  props.timeSelectable && props.endDateTime
    ? extractTimeFromDate(props.endDateTime)
    : ""
);

// 方法
const formatDate = (date: Date) => format(date, "MM/dd");
const extractTimeFromDate = (date: Date) =>
  `${getHours(date).toString().padStart(2, "0")}:${getMinutes(date)
    .toString()
    .padStart(2, "0")}`;

const prevMonth = () =>
  (currentMonth.value = addMonths(currentMonth.value, -1));
const nextMonth = () => (currentMonth.value = addMonths(currentMonth.value, 1));

const selectQuickRange = (index: number) => {
  quickRangeActive.value = index;
  const today = new Date();
  const days = quickRanges[index].days;

  const newStartDate = new Date(today);
  const newEndDate = new Date(addDays(today, days));

  if (props.timeSelectable) {
    emit("update:startDateTime", setHours(setMinutes(newStartDate, 0), 0));
    emit("update:endDateTime", setHours(setMinutes(newEndDate, 59), 23));
  } else {
    emit("update:startDateTime", newStartDate);
    emit("update:endDateTime", newEndDate);
  }

  currentMonth.value = new Date(today.getFullYear(), today.getMonth(), 1);
};

const selectDate = (date: Date) => {
  if (!isSameMonth(date, currentMonth.value)) {
    currentMonth.value = new Date(date.getFullYear(), date.getMonth(), 1);
  }

  if (!props.startDateTime || (props.startDateTime && props.endDateTime)) {
    // 第一次选择或重新选择
    const newDate = new Date(date);
    emit(
      "update:startDateTime",
      props.timeSelectable ? setHours(setMinutes(newDate, 0), 0) : newDate
    );
    emit("update:endDateTime", null);
    quickRangeActive.value = null;
  } else if (props.startDateTime && date < props.startDateTime) {
    // 选择的日期比开始日期早，交换开始和结束日期
    emit("update:endDateTime", new Date(props.startDateTime));
    emit("update:startDateTime", new Date(date));
    quickRangeActive.value = null;
  } else {
    // 正常选择结束日期
    emit("update:endDateTime", new Date(date));
    quickRangeActive.value = null;
  }
};

const setTime = (type: "start" | "end", timeStr: string) => {
  const [hours, minutes] = timeStr.split(":").map(Number);

  if (type === "start" && props.startDateTime) {
    const newDate = new Date(props.startDateTime);
    emit("update:startDateTime", setHours(setMinutes(newDate, minutes), hours));
  } else if (type === "end" && props.endDateTime) {
    const newDate = new Date(props.endDateTime);
    emit("update:endDateTime", setHours(setMinutes(newDate, minutes), hours));
  }
};

const isInRange = (date: Date) => {
  if (!props.startDateTime || !props.endDateTime) return false;
  return isWithinInterval(date, {
    start: props.startDateTime,
    end: props.endDateTime,
  });
};

const isRangeStart = (date: Date) =>
  props.startDateTime ? isSameDay(date, props.startDateTime) : false;
const isRangeEnd = (date: Date) =>
  props.endDateTime ? isSameDay(date, props.endDateTime) : false;

const getDateClass = (date: Date) => {
  const today = new Date();
  if (!isSameMonth(date, currentMonth.value)) return "text-gray-300";

  const classes = [];
  if (isSameDay(date, today)) classes.push("border border-blue-500");
  if (
    (props.startDateTime && isSameDay(date, props.startDateTime)) ||
    (props.endDateTime && isSameDay(date, props.endDateTime))
  ) {
    classes.push("bg-blue-500 text-white");
  }

  return classes.length ? classes.join(" ") : "text-gray-800";
};

const confirmSelection = () => {
  if (!props.startDateTime || !props.endDateTime) {
    showToast({ message: "请选择日期范围", position: "bottom" });
    return;
  }

  if (isAfter(props.startDateTime, props.endDateTime)) {
    showToast({ message: "结束时间不能早于开始时间", position: "bottom" });
    return;
  }

  emit("change", {
    startDateTime: props.startDateTime,
    endDateTime: props.endDateTime,
  });

  showPopup.value = false;
};
</script>

<style scoped>
::-webkit-scrollbar {
  display: none;
}

.grid.grid-cols-7 {
  min-height: 200px;
}

.grid.grid-cols-4 {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}
</style>
