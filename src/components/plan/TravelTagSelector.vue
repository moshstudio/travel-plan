<template>
  <div class="w-full flex flex-col gap-2">
    <!-- 已选标签区域 -->
    <div class="flex gap-1">
      <div
        class="flex-grow flex gap-2 overflow-x-auto overflow-y-hidden thin-scrollbar pb-1"
      >
        <van-tag
          v-for="(tag, index) in selectedTags"
          :key="index"
          round
          type="primary"
          class="cursor-pointer text-xs text-nowrap"
          @click="toggleTagSelection(tag)"
        >
          {{ tag }}
        </van-tag>
        <p
          v-if="selectedTags.length === 0"
          class="text-xs text-[var(--van-text-color-3)]"
        >
          选择标签
        </p>
      </div>
      <p
        v-if="selectedTags.length !== 0"
        class="text-xs text-[var(--van-text-color-3)] text-nowrap w-[15px] text-center"
      >
        {{ selectedTags.length }}
      </p>
    </div>

    <!-- 默认标签区域 -->
    <div class="flex gap-1">
      <div
        class="flex-grow flex gap-2 overflow-x-auto overflow-y-hidden thin-scrollbar pb-1"
      >
        <template
          v-for="(tag, index) in defaultTags"
          :key="`default-tag-${index}`"
        >
          <van-tag
            v-if="!selectedTags.includes(tag)"
            :key="`default-tag-${index}`"
            round
            type="default"
            class="shrink-0 cursor-pointer text-nowrap w-[60px]"
            @click="toggleTagSelection(tag)"
          >
            {{ tag }}
          </van-tag>
        </template>
      </div>
      <van-icon
        name="add-o"
        class="w-[15px] van-haptics-feedback"
        @click="showCreateDialog = true"
      ></van-icon>
    </div>

    <!-- 新建标签对话框 -->
    <van-dialog
      v-model:show="showCreateDialog"
      title="新建标签"
      show-cancel-button
      @confirm="createNewTag"
    >
      <van-field
        v-model="newTagName"
        placeholder="请输入标签名称"
        maxlength="10"
        class="p-4"
      />
    </van-dialog>
  </div>
</template>

<script lang="ts" setup>
import { ref } from "vue";

const selectedTags = defineModel({
  type: Array<string>,
  default: [],
});

const defaultTags = ref<string[]>([
  "酒店住宿",
  "美食街",
  "景点拍照",
  "景区门票",
  "当地美食",
  "特色民宿",
  "特产购物",
  "飞机出行",
  "高铁出行",
  "自驾游",
  "租车服务",
  "青旅体验",
  "露营帐篷",
  "导游服务",
  "旅行保险",
  "行李托运",
  "机场接送",
  "徒步路线",
  "签证服务",
]);

const showCreateDialog = ref(false);
const newTagName = ref("");

const toggleTagSelection = (tag: string) => {
  const index = selectedTags.value.findIndex((t) => t === tag);
  if (index > -1) {
    selectedTags.value.splice(index, 1);
  } else {
    selectedTags.value.unshift(tag);
  }
};

const isTagSelected = (tag: string) => {
  return selectedTags.value.some((t) => t === tag);
};

const createNewTag = () => {
  if (!newTagName.value.trim()) {
    return;
  }
  const newTag = newTagName.value.trim();
  defaultTags.value.push(newTag);
  selectedTags.value.push(newTag);
  newTagName.value = "";
};
</script>

<style scoped lang="less"></style>
