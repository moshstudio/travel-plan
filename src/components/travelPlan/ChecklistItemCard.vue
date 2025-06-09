<template>
  <div
    class="checklist-item relative w-full bg-white rounded-xl shadow-sm p-4 mb-3 transition-all duration-300 border border-gray-100 active:scale-[0.98]"
    :class="{ 'bg-gray-50 opacity-80': item.isPacked }"
    :style="{
      'border-left': `4px solid ${importanceColor[item.priority]}`,
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
    <van-popup
      v-model:show="showChecklistEditPopup"
      position="bottom"
      teleport="body"
      closeable
      round
      destroy-on-close
    >
      <div class="flex flex-col gap-2 p-6 pb-8 shadow">
        <h1 class="text-center">更新物品</h1>
        <div class="flex items-center justify-start gap-2">
          <div class="text-nowrap text-sm">名称</div>
          <van-field
            v-model="editPopupInfos.name"
            placeholder="请输入物品名"
            class="!p-0"
          />
        </div>
        <van-divider></van-divider>
        <div class="flex items-start justify-start gap-2 w-full">
          <div class="text-nowrap text-sm">标签</div>
          <ChecklistTagSelector
            v-model="editPopupInfos.tag"
          ></ChecklistTagSelector>
        </div>
        <van-divider></van-divider>
        <div class="flex items-center justify-start gap-2">
          <p class="text-sm text-nowrap">数量</p>
          <div class="flex-grow flex items-center justify-end w-full gap-2">
            <van-stepper
              v-model="editPopupInfos.quantity"
              :min="1"
              :max="9999"
              :step="1"
              input-width="50px"
              button-size="20px"
            />
          </div>
        </div>
        <van-divider></van-divider>
        <TrippleToggle
          v-model="editPopupInfos.priority"
          :label-style="{ color: 'unset', fontSize: '14px' }"
        ></TrippleToggle>
        <van-divider></van-divider>
        <div class="flex items-center justify-start gap-2">
          <p class="text-sm text-nowrap">打包状态</p>
          <div class="flex-grow flex items-center justify-end w-full gap-2">
            <van-switch
              v-model="editPopupInfos.isPacked"
              size="24"
            />
          </div>
        </div>
        <van-divider></van-divider>
        <DescribeInput
          :describe="editPopupInfos.notes || ''"
          @change="(v) => (editPopupInfos.notes = v)"
          label="备注"
          :label-style="{ color: 'unset', fontSize: '14px' }"
        ></DescribeInput>
        <van-divider></van-divider>
        <div class="flex items-center justify-end">
          <van-button
            size="small"
            type="success"
            @click="onEditPopupSubmit"
          >
            更新物品
          </van-button>
        </div>
      </div>
    </van-popup>
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
import { useStore } from "@/store";
import _ from "lodash";
import { showConfirmDialog, showSuccessToast } from "vant";
import { computed, reactive, ref, toRaw } from "vue";
import { getPlanPriorityColor } from "@/utils/planUtils";
import ChecklistTagSelector from "@/components/checklist/ChecklistTagSelector.vue";
import TrippleToggle from "@/components/plan/TrippleToggle.vue";
import DescribeInput from "@/components/plan/DescribeInput.vue";

const props = defineProps<{
  item: TravelChecklistType;
}>();

const store = useStore();

const importanceColor = {
  low: getPlanPriorityColor("low"),
  medium: getPlanPriorityColor("medium"),
  high: getPlanPriorityColor("high"),
};

const isPacked = computed({
  get: () => props.item.isPacked,
  set: (value) => {
    props.item.isPacked = value;
    store.updateTravelChecklist(props.item);
  },
});

// 操作菜单相关
const showChecklistEditPopup = ref(false);
const editPopupInfos = reactive<
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
const onOpenEditPopup = () => {
  editPopupInfos.name = props.item.name;
  editPopupInfos.tag = props.item.tag;
  editPopupInfos.isPacked = props.item.isPacked;
  editPopupInfos.quantity = props.item.quantity;
  editPopupInfos.priority = props.item.priority;
  editPopupInfos.notes = props.item.notes;
  showChecklistEditPopup.value = true;
};

const showActionSheet = ref(false);
const actionSheetActions = computed(() => {
  return _.filter(
    [
      { name: "编辑", value: "edit", color: "green", icon: "edit" },
      {
        name: "设为高优先级",
        value: "high",
        color: getPlanPriorityColor("high"),
        icon: "fire",
      },
      {
        name: "设为中优先级",
        value: "medium",
        color: getPlanPriorityColor("medium"),
        icon: "warning",
      },
      {
        name: "设为低优先级",
        value: "low",
        color: getPlanPriorityColor("low"),
        icon: "arrow-down",
      },
      { name: "删除", value: "delete", color: "red", icon: "delete" },
    ],
    (action) => action.value !== props.item.priority
  );
});

const onActionSelect = (action: { value: string }) => {
  switch (action.value) {
    case "edit":
      onOpenEditPopup();
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
      props.item.priority = action.value;
      store.updateTravelChecklist(props.item);
      break;
  }
};

const handleCheckChange = (checked: boolean) => {
  isPacked.value = checked;
};

const onEditPopupSubmit = async () => {
  const now = new Date();
  const item: TravelChecklistType = toRaw({
    id: props.item.id,
    itemId: props.item.itemId,
    name: editPopupInfos.name,
    travelId: props.item.travelId,
    tag: editPopupInfos.tag,
    isPacked: editPopupInfos.isPacked,
    quantity: editPopupInfos.quantity,
    priority: editPopupInfos.priority,
    notes: editPopupInfos.notes,
    createdAt: editPopupInfos.createdAt,
    updatedAt: now,
  });
  await store.updateTravelChecklist(item);
  showSuccessToast("清单项更新成功");
  showChecklistEditPopup.value = false;
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
:deep(.van-divider) {
  line-height: 2px;
  margin: 0;
}
</style>
