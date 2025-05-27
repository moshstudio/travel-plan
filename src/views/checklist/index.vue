<script setup lang="ts">
import { ref, computed } from "vue";
import ChecklistItemCard from "@/components/travelPlan/ChecklistItemCard.vue";
import { useStore } from "@/store";
import { storeToRefs } from "pinia";
import { TravelChecklistType } from "@/data/checklist";

const store = useStore();
const { travelChecklists } = storeToRefs(store);

// Grouping options
const groupingOptions = [
  { value: "tag", name: "标签" },
  { value: "importance", name: "优先级" },
  { value: "packed", name: "打包" },
];
const groupingMode = ref("tag");
const showGroupMenu = ref(false);

// Group items by selected mode
const groupedChecklist = computed(() => {
  const items = travelChecklists.value || [];
  const grouped: Record<string, any[]> = {};

  items.forEach((item) => {
    let groupKey = "";

    switch (groupingMode.value) {
      case "tag":
        groupKey = item.tag || "未分类";
        break;
      case "importance":
        groupKey = item.importance || "medium";
        break;
      case "packed":
        groupKey = item.isPacked ? "已打包" : "未打包";
        break;
    }

    if (!grouped[groupKey]) {
      grouped[groupKey] = [];
    }
    grouped[groupKey].push(item);
  });

  // Sort groups based on mode
  const sortedGroups: Record<string, any[]> = {};
  const groupKeys = Object.keys(grouped);

  switch (groupingMode.value) {
    case "importance":
      ["high", "medium", "low"].forEach((key) => {
        if (groupKeys.includes(key)) {
          sortedGroups[key] = grouped[key];
        }
      });
      break;
    case "packed":
      ["未打包", "已打包"].forEach((key) => {
        if (groupKeys.includes(key)) {
          sortedGroups[key] = grouped[key];
        }
      });
      break;
    default:
      groupKeys.sort().forEach((key) => {
        sortedGroups[key] = grouped[key];
      });
  }

  return sortedGroups;
});

// Get all categories with proper display names
const categories = computed(() => {
  return Object.keys(groupedChecklist.value).map((key) => {
    if (groupingMode.value === "importance") {
      return {
        key,
        display:
          key === "high"
            ? "高优先级"
            : key === "medium"
            ? "中优先级"
            : "低优先级",
        icon:
          key === "high"
            ? "warning-o"
            : key === "medium"
            ? "records"
            : "circle",
      };
    } else if (groupingMode.value === "packed") {
      return {
        key,
        display: key,
        icon: key === "已打包" ? "checked" : "clear",
      };
    }
    return {
      key,
      display: key,
      icon: "label-o",
    };
  });
});

async function updatePackaged(item: TravelChecklistType, packed: boolean) {
  item.isPacked = packed;
  await store.updateTravelChecklist(item);
}
</script>

<template>
  <div
    v-remember-scroll
    class="w-full h-full p-0 flex flex-col overflow-auto thin-scrollbar"
  >
    <!-- Simplified grouping control -->
    <div class="grouping-control">
      <van-button
        plain
        hairline
        type="primary"
        size="small"
        @click="showGroupMenu = true"
      >
        <template #icon>
          <van-icon name="apps-o" />
        </template>
        {{ groupingOptions.find((o) => o.value === groupingMode)?.name }}
      </van-button>

      <van-action-sheet
        teleport="body"
        v-model:show="showGroupMenu"
        :actions="groupingOptions"
        cancel-text="取消"
        close-on-click-action
        @select="
          (action) => {
            groupingMode = action.value;
          }
        "
      />
    </div>

    <van-list class="travel-checklist-list thin-scrollbar">
      <div
        v-if="categories.length === 0"
        class="empty-state"
      >
        <img
          src="@/assets/images/empty-checklist.png"
          alt="空状态"
          class="empty-image"
        />
        <p class="empty-text">暂无清单项</p>
        <p class="empty-hint">点击下方按钮添加您的旅行物品</p>
      </div>

      <transition-group
        v-else
        name="fade-slide-y"
        tag="div"
        class="categories-container"
      >
        <div
          v-for="{ key, display, icon } in categories"
          :key="key"
          class="category-section"
          :class="{
            'packed-section': groupingMode === 'packed' && key === '已打包',
          }"
        >
          <div class="section-header">
            <van-icon
              :name="icon"
              class="category-icon"
            />
            <span class="category-title">{{ display }}</span>
            <span class="category-count">
              {{ groupedChecklist[key].length }}
            </span>
          </div>

          <transition-group
            name="list"
            tag="div"
            class="item-container"
          >
            <ChecklistItemCard
              v-for="item in groupedChecklist[key]"
              :key="item.id"
              :item="item"
              :class="{ 'packed-item': item.isPacked }"
              @update:is-packed="(packed) => updatePackaged(item, packed)"
            />
          </transition-group>
        </div>
      </transition-group>
      <div class="shrink-0 h-[220px]"></div>
    </van-list>
  </div>
</template>

<style scoped>
.grouping-control {
  padding: 12px 16px;
  display: flex;
  justify-content: flex-end;
}

.travel-checklist-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 12px;
}

.category-section {
  background-color: white;
  border-radius: 12px;
  margin-bottom: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
}

.section-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  font-size: 15px;
  font-weight: 500;
  color: #333;
  border-bottom: 1px solid #f5f5f5;
}

.category-icon {
  margin-right: 8px;
  color: var(--van-primary-color);
}

.category-title {
  flex: 1;
}

.category-count {
  background-color: #f0f0f0;
  color: #666;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 10px;
}

.item-container {
  padding: 8px 12px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  background: white;
  border-radius: 16px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  margin-top: 20px;
  animation: fadeIn 0.5s ease-out;
}

.empty-image {
  width: 180px;
  height: 180px;
  margin-bottom: 20px;
  opacity: 0.7;
}

.empty-text {
  font-size: 18px;
  color: #333;
  font-weight: 500;
  margin-bottom: 8px;
}

.empty-hint {
  font-size: 14px;
  color: #888;
}

.packed-item {
  opacity: 0.7;
}

.packed-section {
  opacity: 0.9;
}

.packed-section .section-header {
  opacity: 0.9;
  background-color: #fafafa;
}

/* 统一动画效果 */
.fade-slide-y-enter-active,
.fade-slide-y-leave-active {
  transition: all 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

.fade-slide-y-enter-from,
.fade-slide-y-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

.list-move,
.list-enter-active,
.list-leave-active {
  transition: all 0.4s cubic-bezier(0.22, 1, 0.36, 1);
}

.list-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}

.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

.list-leave-active {
  position: absolute;
  width: calc(100% - 24px);
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 卡片悬停效果 */
.ChecklistItemCard {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.ChecklistItemCard:not(.packed-item):hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
</style>
