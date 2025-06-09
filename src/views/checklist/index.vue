<script setup lang="ts">
import { ref, computed, reactive, toRaw } from "vue";
import ChecklistItemCard from "@/components/travelPlan/ChecklistItemCard.vue";
import ChecklistTagSelector from "@/components/checklist/ChecklistTagSelector.vue";
import TrippleToggle from "@/components/plan/TrippleToggle.vue";
import DescribeInput from "@/components/plan/DescribeInput.vue";
import { useStore } from "@/store";
import { storeToRefs } from "pinia";
import { TravelChecklistType } from "@/data/checklist";
import { useDisplayStore } from "@/store/displayStore";
import { showFailToast, showSuccessToast } from "vant";
import router from "@/router";

const store = useStore();
const displayStore = useDisplayStore();
const { currentTravel, travelChecklists } = storeToRefs(store);
const { showChecklistCreatePopup, checklistGroupingMode: groupingMode } =
  storeToRefs(displayStore);

// Grouping options
const groupingOptions = [
  { value: "tag", name: "标签" },
  { value: "priority", name: "优先级" },
  { value: "packed", name: "打包" },
];
const showGroupMenu = ref(false);

const createPopupInfos = reactive<
  Omit<TravelChecklistType, "id" | "itemId" | "travelId">
>({
  name: "",
  tag: "",
  isPacked: false,
  quantity: 1,
  priority: "medium",
  notes: "",
  createdAt: new Date(),
  updatedAt: new Date(),
});

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
      case "priority":
        groupKey = item.priority || "medium";
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
    case "priority":
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
    if (groupingMode.value === "priority") {
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
async function addChecklist() {
  if (!currentTravel.value) {
    showFailToast("请先创建旅行");
    router.push({ name: "CreateTravel" });
    return;
  }

  const now = new Date();
  const checklistItem: Omit<TravelChecklistType, "id" | "itemId"> = toRaw({
    name: createPopupInfos.name,
    travelId: currentTravel.value.travelId,
    tag: createPopupInfos.tag,
    isPacked: createPopupInfos.isPacked,
    quantity: createPopupInfos.quantity,
    priority: createPopupInfos.priority,
    notes: createPopupInfos.notes,
    createdAt: now,
    updatedAt: now,
  });
  await store.addChecklistItem(checklistItem);
  showSuccessToast("清单项添加成功");
  showChecklistCreatePopup.value = false;
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
    <van-popup
      v-model:show="showChecklistCreatePopup"
      position="bottom"
      teleport="body"
      closeable
      round
    >
      <div class="flex flex-col gap-2 p-6 pb-8 shadow">
        <h1 class="text-center">新建物品</h1>
        <div class="flex items-center justify-start gap-2">
          <div class="text-nowrap text-sm">名称</div>
          <van-field
            v-model="createPopupInfos.name"
            placeholder="请输入物品名"
            class="!p-0"
          />
        </div>
        <van-divider></van-divider>
        <div class="flex items-start justify-start gap-2 w-full">
          <div class="text-nowrap text-sm">标签</div>
          <ChecklistTagSelector
            v-model="createPopupInfos.tag"
          ></ChecklistTagSelector>
        </div>
        <van-divider></van-divider>
        <div class="flex items-center justify-start gap-2">
          <p class="text-sm text-nowrap">数量</p>
          <div class="flex-grow flex items-center justify-end w-full gap-2">
            <van-stepper
              v-model="createPopupInfos.quantity"
              :min="1"
              :max="1000"
              :step="0.5"
              input-width="50px"
              button-size="20px"
            />
          </div>
        </div>
        <van-divider></van-divider>
        <TrippleToggle
          v-model="createPopupInfos.priority"
          :label-style="{ color: 'unset', fontSize: '14px' }"
        ></TrippleToggle>
        <van-divider></van-divider>
        <div class="flex items-center justify-start gap-2">
          <p class="text-sm text-nowrap">打包状态</p>
          <div class="flex-grow flex items-center justify-end w-full gap-2">
            <van-switch
              v-model="createPopupInfos.isPacked"
              size="24"
            />
          </div>
        </div>
        <van-divider></van-divider>
        <DescribeInput
          :describe="createPopupInfos.notes || ''"
          @change="(v) => (createPopupInfos.notes = v)"
          label="备注"
          :label-style="{ color: 'unset', fontSize: '14px' }"
        ></DescribeInput>
        <van-divider></van-divider>
        <div class="flex items-center justify-end">
          <van-button
            size="small"
            type="primary"
            @click="addChecklist"
          >
            添加物品
          </van-button>
        </div>
      </div>
    </van-popup>
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
:deep(.van-divider) {
  line-height: 2px;
  margin: 0;
}
</style>
