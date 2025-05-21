<template>
  <div class="tag-selector">
    <!-- 显示当前选中的标签 - 改进了展示样式 -->
    <van-cell
      :title="title"
      @click="showPopup = true"
      is-link
      :class="{ 'text-gray-400': selectedTags.length === 0 }"
    >
      <template #value>
        <div
          v-if="selectedTags.length > 0"
          class="selected-tags-container"
        >
          <van-tag
            v-for="tag in selectedTags"
            :key="tag"
            type="primary"
            size="medium"
            round
            class="mr-1 mb-1"
          >
            {{ tag }}
          </van-tag>
        </div>
        <span
          v-else
          class="text-gray-400"
          >{{ placeholder }}</span
        >
      </template>
    </van-cell>

    <!-- 标签选择弹出层 -->
    <van-popup
      v-model:show="showPopup"
      position="bottom"
      round
      :style="{ height: '70%' }"
    >
      <div class="p-4 h-full flex flex-col">
        <h2 class="text-lg font-bold mb-4 text-center">{{ title }}</h2>

        <!-- 默认标签 -->
        <div class="mb-6">
          <h3 class="text-md font-semibold mb-3 text-gray-700">热门标签</h3>
          <div class="flex flex-wrap gap-2">
            <van-tag
              v-for="tag in defaultTags"
              :key="tag"
              :type="getTagType(tag)"
              size="medium"
              round
              @click="toggleTag(tag)"
            >
              {{ tag }}
            </van-tag>
          </div>
        </div>

        <!-- 自定义标签 -->
        <div class="mb-4 flex-1">
          <h3 class="text-md font-semibold mb-3 text-gray-700">自定义标签</h3>
          <div class="flex gap-2 mb-3">
            <van-field
              v-model="customTag"
              placeholder="输入自定义标签"
              clearable
              class="flex-1 rounded-lg"
              @keyup.enter="addCustomTag"
            />
            <van-button
              type="primary"
              size="small"
              @click="addCustomTag"
              :disabled="!customTag.trim()"
              class="rounded-lg"
            >
              添加
            </van-button>
          </div>
          <div
            class="flex flex-wrap gap-2"
            v-if="customTags.length > 0"
          >
            <van-tag
              v-for="tag in customTags"
              :key="'custom-' + tag"
              :type="getTagType(tag)"
              size="medium"
              round
              closeable
              @close="removeCustomTag(tag)"
              @click="toggleTag(tag)"
              class="px-3 py-1 transition-all duration-200 cursor-pointer select-none"
            >
              {{ tag }}
            </van-tag>
          </div>
          <div
            v-else
            class="text-gray-400 text-sm"
          >
            暂无自定义标签，输入后点击添加
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="mt-4 flex gap-3">
          <van-button
            type="default"
            block
            @click="handleCancel"
            class="rounded-lg"
          >
            取消
          </van-button>
          <van-button
            type="primary"
            block
            @click="confirmSelection"
            class="rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500"
          >
            确定 ({{ selectedTags.length }}/{{ maxTags }})
          </van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { showToast } from "vant";
import { ref, watch, computed } from "vue";

// 定义 props
const props = defineProps({
  title: {
    type: String,
    default: "选择标签",
  },
  placeholder: {
    type: String,
    default: "请选择标签",
  },
  modelValue: {
    type: Array as () => string[],
    default: () => [],
  },
  maxTags: {
    type: Number,
    default: 5,
  },
  defaultTags: {
    type: Array as () => string[],
    default: () => [
      "飞机出行",
      "高铁出行",
      "自驾游",
      "租车服务",
      "酒店住宿",
      "特色民宿",
      "青旅体验",
      "露营帐篷",
      "景区门票",
      "导游服务",
      "旅行保险",
      "行李托运",
      "机场接送",
      "当地美食",
      "特产购物",
      "景点拍照",
      "徒步路线",
      "潜水体验",
      "滑雪装备",
      "签证服务",
    ],
  },
});

// 定义 emit
const emit = defineEmits(["update:modelValue", "cancel"]);

const showPopup = ref(false);
const customTag = ref("");
const customTags = ref<string[]>([]);
const selectedTags = ref<string[]>([]);
const tempSelectedTags = ref<string[]>([]); // 临时存储用于取消操作

// 初始化选中的标签
watch(
  () => props.modelValue,
  (newVal) => {
    selectedTags.value = [...newVal];
    tempSelectedTags.value = [...newVal];
    // 分离出自定义标签
    customTags.value = newVal.filter((tag) => !props.defaultTags.includes(tag));
  },
  { immediate: true }
);

// 获取标签类型
function getTagType(tag: string) {
  return selectedTags.value.includes(tag) ? "primary" : "default";
}

// 切换标签选择状态
function toggleTag(tag: string) {
  if (props.maxTags === 1) {
    // 单选模式：直接替换当前选中的标签
    selectedTags.value = [tag];
  } else {
    // 多选模式：正常切换
    const index = selectedTags.value.indexOf(tag);
    if (index > -1) {
      selectedTags.value.splice(index, 1);
    } else {
      if (selectedTags.value.length < props.maxTags) {
        selectedTags.value.push(tag);
      } else {
        showToast(`最多只能选择${props.maxTags}个标签`);
      }
    }
  }
}

// 添加自定义标签
function addCustomTag() {
  const tag = customTag.value.trim();
  if (tag) {
    if (props.maxTags === 1) {
      // 单选模式：直接替换当前选中的标签
      if (!customTags.value.includes(tag)) {
        customTags.value.push(tag);
      }
      selectedTags.value = [tag];
      customTag.value = "";
    } else {
      // 多选模式：正常添加
      if (!selectedTags.value.includes(tag)) {
        if (selectedTags.value.length < props.maxTags) {
          if (!customTags.value.includes(tag)) {
            customTags.value.push(tag);
          }
          selectedTags.value.push(tag);
          customTag.value = "";
        } else {
          showToast(`最多只能选择${props.maxTags}个标签`);
        }
      }
    }
  }
}

// 移除自定义标签
function removeCustomTag(tag: string) {
  const index = customTags.value.indexOf(tag);
  if (index > -1) {
    customTags.value.splice(index, 1);
  }

  const selectedIndex = selectedTags.value.indexOf(tag);
  if (selectedIndex > -1) {
    selectedTags.value.splice(selectedIndex, 1);
  }
}

// 确认选择
function confirmSelection() {
  tempSelectedTags.value = [...selectedTags.value];
  emit("update:modelValue", selectedTags.value);
  showPopup.value = false;
}

// 取消操作
function handleCancel() {
  // 恢复之前的选择状态
  selectedTags.value = [...tempSelectedTags.value];
  // 更新自定义标签列表
  customTags.value = selectedTags.value.filter(
    (tag) => !props.defaultTags.includes(tag)
  );
  showPopup.value = false;
  emit("cancel");
}
</script>

<style scoped>
.tag-selector {
  --van-tag-primary-color: #3b82f6;
  --van-tag-primary-background-color: #eff6ff;
  --van-tag-default-color: #6b7280;
  --van-tag-default-background-color: #f3f4f6;
}

.van-tag--primary {
  background: linear-gradient(to right, #3b82f6, #6366f1);
  color: white;
  border: none;
}

.van-tag--default {
  background-color: var(--van-tag-default-background-color);
  color: var(--van-tag-default-color);
  border: none;
}

.van-cell {
  cursor: pointer;
  align-items: flex-start;
}

.van-popup {
  overflow: hidden;
}

.van-button--primary {
  border: none;
}

.selected-tags-container {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: end;
  min-height: 24px;
}
</style>