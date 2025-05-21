<template>
  <div
    class="checklist-item"
    :class="{ 'item-packed': item.isPacked }"
    @click="handleClickCard"
    @touchstart="startPress"
    @touchend="endPress"
    :style="{
      transform: `scale(${pressScale})`,
      'border-left': `4px solid ${importanceColor[item.importance]}`,
    }"
  >
    <!-- 左侧复选框和主要内容 -->
    <div class="item-main">
      <van-checkbox
        v-model="isPacked"
        :name="item.id.toString()"
        @change="handleCheckChange"
        class="item-checkbox"
        shape="square"
        checked-color="#07c160"
        icon-size="18px"
      ></van-checkbox>

      <div class="item-content">
        <!-- 名称和操作按钮 -->
        <div class="item-header">
          <h3 class="item-name">{{ item.name }}</h3>
          <van-button
            round
            size="mini"
            plain
            @click.stop="showActionSheet = true"
            class="action-button"
          >
            <van-icon
              name="ellipsis"
              size="14"
            />
          </van-button>
        </div>

        <!-- 分类和数量 -->
        <div class="item-meta">
          <van-tag
            class="category-tag"
            plain
            type="primary"
            size="medium"
          >
            {{ item.tag }}
          </van-tag>
          <span class="quantity">x{{ item.quantity }}</span>
        </div>

        <!-- 备注 -->
        <div
          v-if="item.notes"
          class="item-notes"
        >
          <van-icon
            name="notes-o"
            size="14"
          />
          <span>{{ item.notes }}</span>
        </div>
      </div>
    </div>
  </div>

  <!-- 操作菜单 -->
  <van-action-sheet
    teleport="body"
    v-model:show="showActionSheet"
    :actions="actionSheetActions"
    cancel-text="取消"
    close-on-click-action
    @select="onActionSelect"
  />
</template>

<script setup lang="ts">
import router from "@/router";
import { useStore } from "@/store";
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
const actionSheetActions = [
  { name: "编辑", value: "edit", color: "green", icon: "edit" },
  { name: "设为高优先级", value: "high", color: "#ee0a24", icon: "fire" },
  { name: "设为中优先级", value: "medium", color: "#ff976a", icon: "warning" },
  { name: "设为低优先级", value: "low", color: "#1989fa", icon: "arrow-down" },
  { name: "删除", value: "delete", color: "red", icon: "delete" },
];

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
  background: white;
  border-radius: 12px;
  padding: 14px 16px;
  margin-bottom: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  position: relative;
  overflow: hidden;
  transform-origin: center;
  will-change: transform;
  border: 1px solid rgba(0, 0, 0, 0.03);
  border-left-width: 4px;
  border-left-style: solid;
}

.checklist-item:active {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.item-packed {
  opacity: 0.7;
  background: #f9f9f9;
}

.item-packed .item-name {
  text-decoration: line-through;
  color: #999;
}

.item-main {
  display: flex;
  align-items: flex-start;
}

.item-checkbox {
  margin-right: 12px;
  margin-top: 2px;
}

.item-checkbox :deep(.van-checkbox__icon) {
  border-radius: 4px;
}

.item-content {
  flex: 1;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.item-name {
  font-size: 16px;
  font-weight: 500;
  color: #333;
  transition: all 0.3s ease;
  margin: 0;
}

.action-button {
  padding: 0 6px;
  min-width: 24px;
  height: 24px;
  border: 1px solid #e5e7eb;
  background: white;
  color: #6b7280;
}

.item-meta {
  display: flex;
  align-items: center;
  margin-bottom: 6px;
}

.category-tag {
  margin-right: 8px;
  font-size: 12px;
  border-radius: 4px;
}

.quantity {
  font-size: 13px;
  color: #666;
}

.item-notes {
  display: flex;
  align-items: center;
  font-size: 13px;
  color: #888;
  margin-top: 4px;
}

.item-notes .van-icon {
  margin-right: 4px;
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
