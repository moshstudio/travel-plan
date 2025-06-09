<template>
  <div class="w-full flex flex-col gap-2 mt-[2px]">
    <!-- 已选标签区域 -->
    <div class="flex gap-1">
      <div
        class="flex-grow flex gap-2 overflow-x-auto overflow-y-hidden thin-scrollbar"
      >
        <van-tag
          v-if="selectedTag.trim()"
          round
          type="primary"
          class="cursor-pointer text-xs text-nowrap"
          @click="toggleTagSelection(selectedTag)"
        >
          {{ selectedTag }}
        </van-tag>
        <p
          v-if="!selectedTag"
          class="text-xs text-[var(--van-text-color-3)]"
        >
          选择标签
        </p>
      </div>
    </div>

    <!-- 默认标签区域 -->
    <div class="flex gap-1 w-full">
      <div
        class="w-[calc(100%-60px)] flex gap-2 overflow-x-auto overflow-y-hidden thin-scrollbar pb-1"
      >
        <template
          v-for="(tag, index) in defaultTags"
          :key="`default-tag-${index}`"
        >
          <van-tag
            v-if="selectedTag !== tag"
            :key="`default-tag-${index}`"
            round
            type="default"
            class="cursor-pointer text-nowrap w-[60px]"
            @click="toggleTagSelection(tag)"
          >
            {{ tag }}
          </van-tag>
        </template>
      </div>
      <van-icon
        name="add-o"
        class="w-[15px] van-haptics-feedback shrink-0"
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

const selectedTag = defineModel({
  type: String,
  required: true,
});

const defaultTags = ref<string[]>([
  "衣物",
  "电子设备",
  "证件",
  "洗漱用品",
  "化妆品",
  "药品",
  "食品",
  "户外用品",
  "其他",
]);

const showCreateDialog = ref(false);
const newTagName = ref("");

const toggleTagSelection = (tag: string) => {
  if (selectedTag.value === tag) {
    selectedTag.value = "";
  } else {
    selectedTag.value = tag;
  }
};

const isTagSelected = (tag: string) => {
  return selectedTag.value === tag;
};

const createNewTag = () => {
  if (!newTagName.value.trim()) {
    return;
  }
  const newTag = newTagName.value.trim();
  defaultTags.value.push(newTag);
  selectedTag.value = newTag;
  newTagName.value = "";
};
</script>

<style scoped lang="less"></style>
