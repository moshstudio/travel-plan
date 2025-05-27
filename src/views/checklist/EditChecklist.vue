<script setup lang="ts">
import { reactive, onMounted, ref, toRaw, onActivated } from "vue";
import { useStore } from "@/store";
import { showFailToast, showSuccessToast } from "vant";
import router from "@/router";
import { storeToRefs } from "pinia";
import PrioritySelector from "@/components/PrioritySelector.vue";
import TravelTagSelector from "@/components/TravelTagSelector.vue";
import { TravelChecklistType } from "@/data/checklist";

const { itemId: checklistItemId } = defineProps({
  itemId: String,
});

const store = useStore();
const { currentTravel } = storeToRefs(store);
const checklistItem = ref<TravelChecklistType>();

// 表单数据
const form = reactive({
  itemId: "",
  name: "",
  tags: [] as string[],
  quantity: 1,
  notes: "",
  priority: "medium" as "low" | "medium" | "high",
  isPacked: false,
});

const loadData = async () => {
  console.log("checklistItemId:", checklistItemId);

  if (!checklistItemId) return;
  checklistItem.value = await store.getChecklistItem(checklistItemId);
  if (!checklistItem.value) {
    showFailToast("清单项不存在");
    back();
    return;
  }
  form.itemId = checklistItem.value.itemId;
  form.name = checklistItem.value.name;
  form.tags = [checklistItem.value.tag];
  form.quantity = checklistItem.value.quantity;
  form.notes = checklistItem.value.notes || "";
  form.priority = checklistItem.value.importance;
  form.isPacked = checklistItem.value.isPacked;
  console.log("checklistItem:", checklistItem.value);
};

// 提交表单
const onSubmit = async () => {
  if (!form.name || !form.tags.length) {
    showFailToast("请填写必填信息");
    return;
  }

  if (!currentTravel.value) {
    showFailToast("请先创建旅行");
    router.push({ name: "CreateTravel" });
    return;
  }
  if (!checklistItem.value) {
    showFailToast("清单不存在");
    return;
  }

  const now = new Date();
  const item: TravelChecklistType = toRaw({
    id: checklistItem.value.id,
    itemId: form.itemId,
    name: form.name,
    travelId: currentTravel.value.travelId,
    tag: form.tags[0],
    isPacked: form.isPacked,
    quantity: form.quantity,
    importance: form.priority,
    notes: form.notes,
    createdAt: checklistItem.value.createdAt,
    updatedAt: now,
  });
  console.log("提交的清单项数据:", item);

  await store.updateTravelChecklist(item);
  showSuccessToast("清单项更新成功");
  back();
};

const back = () => {
  router.push({ name: "Travel" });
};

// 预定义的分类选项
const categories = [
  "衣物",
  "电子设备",
  "证件",
  "洗漱用品",
  "药品",
  "食品",
  "户外用品",
  "其他",
];

onMounted(async () => {
  await loadData();
});
onActivated(async () => {
  await loadData();
});
</script>

<template>
  <div
    class="w-screen h-screen flex flex-col overflow-hidden bg-[var(--van-background)]"
  >
    <van-nav-bar
      title="编辑清单项"
      left-arrow
      @click-left="back"
    />

    <div class="flex-grow w-full h-full p-2 overflow-auto">
      <van-cell-group inset>
        <van-field
          v-model="form.name"
          label="物品名称"
          placeholder="请输入物品名称"
          clearable
          required
        />

        <TravelTagSelector
          :tags="form.tags"
          :custom-tags="store.customTravelChecklistTags"
          @update:tags="(tags) => (form.tags = tags)"
          @update:custom-tags="
            (tags) => store.updateCustomTravelChecklistTags(tags)
          "
          :default-tags="categories"
          :max-tags="1"
        ></TravelTagSelector>

        <van-field
          v-model.number="form.quantity"
          label="数量"
          type="number"
        >
          <template #extra>
            <van-stepper
              v-model="form.quantity"
              min="1"
            />
          </template>
        </van-field>

        <PrioritySelector v-model="form.priority" />

        <van-cell title="打包状态">
          <template #value>
            <van-switch
              v-model="form.isPacked"
              size="24"
            />
          </template>
        </van-cell>

        <van-field
          v-model="form.notes"
          rows="3"
          autosize
          label="备注"
          type="textarea"
          placeholder="请输入备注信息"
          show-word-limit
          maxlength="200"
        />
      </van-cell-group>

      <!-- 提交按钮 -->
      <div class="p-4">
        <van-button
          round
          block
          type="primary"
          class="bg-blue-500"
          @click="onSubmit"
        >
          更新清单项
        </van-button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
:deep(.van-cell__title) {
  flex: none;
}
:deep(.van-dropdown-menu__bar) {
  box-shadow: none;
}
:deep(.van-dropdown-item__content) {
  max-height: 200px;
}
</style>
