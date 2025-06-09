<script setup lang="ts">
import { ref, onMounted, nextTick, computed } from "vue";
import PlanList from "@/views/plan/index.vue";
import CheckList from "@/views/checklist/index.vue";
import ExpenseList from "@/views/expense/index.vue";
import StatsList from "@/views/stats/index.vue";
import { useStore } from "@/store";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import { getProxyUrl } from "@/utils/proxyUrl";
import { tdtUrl } from "@/constants/tdt";
import { showConfirmDialog } from "vant";
import { useDisplayStore } from "@/store/displayStore";
import { sleep } from "@/utils";

const router = useRouter();
const store = useStore();
const displayStore = useDisplayStore();
const {
  currentTravel,
  travelPlansBeforeToday,
  travelPlansFromToday,
  travelPlans,
} = storeToRefs(store);
const { activeTabName } = storeToRefs(displayStore);

const showTitlePopup = ref(false);

const travelOptions = computed(() => {
  return store.travels?.map((travel) => {
    return {
      text: travel.name,
      value: travel.travelId,
    };
  });
});

const onClickAdd = () => {
  switch (activeTabName.value) {
    case "plan":
      router.push({ name: "PlanMap" });
      break;
    case "checklist":
      displayStore.showChecklistCreatePopup = true;
      break;
    case "expense":
      router.push({ name: "ExpenseMap" });
      break;
    case "stats":
      router.push({ name: "stats" });
      break;
    default:
      console.error("无效的选项");
      return;
  }
};
const onSelectTravel = (value: any) => {
  const newTravel = store.travels?.find(
    (travel) => travel.travelId === value.selectedValues[0]
  );
  if (!newTravel) {
    return;
  }
  store.switchTravel(newTravel);
  showTitlePopup.value = false;
};

onMounted(async () => {
  await sleep(1000);
  if (!currentTravel.value) {
    showConfirmDialog({
      title: "提示",
      message: "您还没有创建任何旅行, 是否立即创建?",
      confirmButtonText: "创建旅行",
      cancelButtonText: "取消",
    }).then(() => {
      router.push({ name: "CreateTravel" });
    });
  }
});

// 新增：定义控制动作面板显示的响应式变量
const showActionSheet = ref(false);

const moreActions = [
  {
    name: "创建新旅行",
    color: "green",
    callback: () => {
      router.push({ name: "CreateTravel" });
    },
  },
  {
    name: "重命名旅行",
    color: "#1E90FF",
    callback: () => {
      if (!currentTravel.value) {
        return;
      }
      router.push({
        name: "EditTravel",
        params: { travelId: currentTravel.value.travelId },
      });
    },
  },
  {
    name: "删除此旅行",
    color: "red",
    callback: () => {
      showConfirmDialog({
        title: "提示",
        message: "确定要删除此旅行吗?",
        confirmButtonText: "确定",
        cancelButtonText: "取消",
      }).then(() => {
        if (!currentTravel.value) {
          return;
        }
        store.deleteTravel(currentTravel.value);
      });
    },
  },
];
</script>

<template>
  <div class="travel-plans-app">
    <van-nav-bar
      :title="currentTravel?.name || '旅行计划'"
      class="app-nav-bar"
      :border="false"
    >
      <template #right>
        <van-icon
          name="ellipsis"
          size="18"
          color="white"
          @click="showActionSheet = true"
        />
      </template>
      <template
        #title
        v-if="currentTravel"
      >
        <div
          @click="showTitlePopup = true"
          class="active:scale-95 transition-all"
        >
          {{ currentTravel?.name || "旅行计划" }}
          <van-icon
            name="arrow-down"
            size="14"
            color="white"
          />
        </div>
      </template>
    </van-nav-bar>

    <div class="app-background"></div>
    <div
      class="w-full h-full overflow-hidden rounded-lg shadow-lg thin-scrollbar"
    >
      <van-tabs
        v-model:active="activeTabName"
        background="linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)"
        color="#fff"
        title-active-color="#fff"
        title-inactive-color="rgba(255,255,255,0.7)"
        sticky
        shrink
        :swipeable="false"
        animated
        lazy-render
        :offset-top="46"
        class="w-full h-full overflow-hidden"
      >
        <van-tab
          title="计划"
          name="plan"
          class="w-full h-full overflow-hidden"
        >
          <PlanList></PlanList>
        </van-tab>
        <van-tab
          title="清单"
          name="checklist"
          class="w-full h-full overflow-hidden"
        >
          <CheckList></CheckList>
        </van-tab>
        <van-tab
          title="花费"
          name="expense"
          class="w-full h-full overflow-hidden"
        >
          <ExpenseList></ExpenseList>
        </van-tab>
        <van-tab
          title="统计"
          name="stats"
          class="w-full h-full overflow-hidden"
        >
          <StatsList></StatsList>
        </van-tab>
      </van-tabs>
    </div>
    <van-floating-bubble
      v-if="activeTabName !== 'stats'"
      axis="xy"
      magnetic="x"
      icon="plus"
      @click="onClickAdd"
      class="add-button"
    />

    <van-popup
      v-model:show="showTitlePopup"
      position="bottom"
    >
      <van-picker
        title="选择旅行"
        :columns="travelOptions"
        @cancel="showTitlePopup = false"
        @confirm="onSelectTravel"
      />
    </van-popup>
    <van-action-sheet
      teleport="body"
      cancel-text="取消"
      v-model:show="showActionSheet"
      :actions="moreActions"
      close-on-click-action
    />
  </div>
</template>

<style scoped lang="less">
.travel-plans-app {
  position: relative;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background-color: #f5f7fa;
}

.app-nav-bar {
  background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
  color: white;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.app-nav-bar :deep(.van-nav-bar__title) {
  color: white;
  font-weight: 600;
}

.app-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 180px;
  background: linear-gradient(135deg, #6a11cb 0%, #2575fc 100%);
  z-index: 0;
  border-bottom-left-radius: 20px;
  border-bottom-right-radius: 20px;
}
:deep(.van-tabs__content) {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
:deep(.van-tab__panel) {
  width: 100%;
  height: 100%;
  overflow: hidden;
}
</style>
