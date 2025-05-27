<template>
  <div
    class="checklist-item relative w-full bg-white rounded-xl shadow-sm p-4 mb-3 transition-all duration-300 border border-gray-100 active:scale-[0.98]"
    :class="{ 'bg-gray-50 opacity-80': item.isPacked }"
    @click="handleClickCard"
    @touchstart="startPress"
    @touchend="endPress"
    :style="{
      transform: `scale(${pressScale})`,
      'border-left': `4px solid ${importanceColor[item.importance]}`,
    }"
  >
    <!-- 左侧复选框和主要内容 -->
    <div class="item-main flex items-start">
      <van-checkbox
        v-model="isPacked"
        :name="item.id.toString()"
        @change="handleCheckChange"
        class="item-checkbox mr-3 mt-0.5"
        shape="square"
        checked-color="#07c160"
        icon-size="18px"
      ></van-checkbox>

      <div class="item-content flex-1">
        <!-- 名称和操作按钮 -->
        <div class="item-header flex justify-between items-center mb-1.5">
          <h3
            class="item-name flex-1 text-base font-medium text-gray-800 truncate mr-2"
            :class="{ 'line-through text-gray-500': item.isPacked }"
          >
            {{ item.name }}
          </h3>
          <van-button
            round
            size="mini"
            plain
            @click.stop="showActionSheet = true"
            class="action-button p-0 w-6 h-6 min-w-6 border border-gray-200 bg-white text-gray-500"
          >
            <van-icon
              name="ellipsis"
              size="14"
            />
          </van-button>
        </div>

        <!-- 分类和数量 -->
        <div class="item-meta flex items-center mb-1.5">
          <van-tag
            class="category-tag mr-2 text-xs rounded"
            plain
            type="primary"
            size="medium"
          >
            {{ item.tag }}
          </van-tag>
          <span class="quantity text-sm text-gray-600">
            x{{ item.quantity }}
          </span>
        </div>

        <!-- 备注 -->
        <div
          v-if="item.notes"
          class="item-notes flex items-center text-sm text-gray-500"
        >
          <van-icon
            name="notes-o"
            size="14"
            class="mr-1"
          />
          <span>{{ item.notes }}</span>
        </div>
      </div>
    </div>
    <!-- 操作菜单 -->
    <van-action-sheet
      teleport="body"
      v-model:show="showActionSheet"
      :actions="actionSheetActions"
      :title="item.name"
      cancel-text="取消"
      close-on-click-action
      @select="onActionSelect"
    />
  </div>
</template>

<script setup lang="ts">
import { TravelChecklistType } from "@/data/checklist";
import router from "@/router";
import { useStore } from "@/store";
import _ from "lodash";
import { showConfirmDialog } from "vant";
import { computed, ref } from "vue";

const props = defineProps<{
  item: TravelChecklistType;
}>();

const store = useStore();

const importanceColor = {
  low: "#1989fa",
  medium: "#ff976a",
  high: "#ee0a24",
};

const isPacked = computed({
  get: () => props.item.isPacked,
  set: (value) => {
    props.item.isPacked = value;
    store.updateTravelChecklist(props.item);
  },
});

// 操作菜单相关
const showActionSheet = ref(false);
const actionSheetActions = computed(() => {
  return _.filter(
    [
      { name: "编辑", value: "edit", color: "green", icon: "edit" },
      { name: "设为高优先级", value: "high", color: "#ee0a24", icon: "fire" },
      {
        name: "设为中优先级",
        value: "medium",
        color: "#ff976a",
        icon: "warning",
      },
      {
        name: "设为低优先级",
        value: "low",
        color: "#1989fa",
        icon: "arrow-down",
      },
      { name: "删除", value: "delete", color: "red", icon: "delete" },
    ],
    (action) => action.value !== props.item.importance
  );
});

const onActionSelect = (action: { value: string }) => {
  switch (action.value) {
    case "edit":
      router.push({
        name: "EditChecklist",
        params: { itemId: props.item.itemId },
      });
      break;
    case "delete":
      showConfirmDialog({
        title: "确定删除该条清单吗？",
        message: "删除后无法恢复",
        confirmButtonText: "确定",
        cancelButtonText: "取消",
      }).then(() => {
        store.deleteTravelChecklist(props.item);
      });
      break;
    case "high":
    case "medium":
    case "low":
      props.item.importance = action.value;
      store.updateTravelChecklist(props.item);
      break;
  }
};

// 触摸反馈效果
const pressScale = ref(1);
const isPressing = ref(false);

const startPress = () => {
  isPressing.value = true;
  pressScale.value = 0.98;
};

const endPress = () => {
  isPressing.value = false;
  pressScale.value = 1;
};

const handleClickCard = () => {
  // handleCheckChange(!isPacked.value);
};

const handleCheckChange = (checked: boolean) => {
  isPacked.value = checked;
};
</script>

<style scoped>
.checklist-item {
  transform-origin: center;
  will-change: transform;
}

.item-checkbox :deep(.van-checkbox__icon) {
  border-radius: 4px;
}

/* 添加进入动画 */
.checklist-item-enter-active,
.checklist-item-leave-active {
  transition: all 0.3s ease;
}

.checklist-item-enter-from,
.checklist-item-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
</style>
