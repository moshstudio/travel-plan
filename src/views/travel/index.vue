<script setup lang="ts">
import { ref, onMounted, nextTick, computed } from "vue";
import PlanList from "@/views/plan/index.vue";
import CheckList from "@/views/checklist/index.vue";
import { useStore } from "@/store";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import { getProxyUrl } from "@/utils/proxyUrl";
import { tdtUrl } from "@/constants/tdt";

const router = useRouter();
const store = useStore();
const {
  currentTravel,
  travelPlansBeforeToday,
  travelPlansFromToday,
  travelPlans,
} = storeToRefs(store);

const activeTab = ref("");
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
  switch (activeTab.value) {
    case "plan":
      router.push({ name: "CreatePlan" });
      break;
    case "checklist":
      router.push({ name: "CreateChecklist" });
      break;
    case "fee":
      router.push({ name: "CreateFee" });
      break;
    case "statistic":
      router.push({ name: "Statistic" });
      break;
    default:
      console.error("无效的选项");
      return;
  }
};
const onSelectTravel = (value: any) => {
  console.log(value);

  const newTravel = store.travels?.find(
    (travel) => travel.travelId === value.selectedValues[0]
  );
  if (!newTravel) {
    return;
  }
  store.switchTravel(newTravel);
  showTitlePopup.value = false;
};
function loadTianDiTuAPI() {
  return new Promise<void>(async (resolve, reject) => {
    const script = document.createElement("script");
    const url = await getProxyUrl(tdtUrl);
    script.src = url!;
    script.type = "text/javascript";
    script.onload = () => {
      console.log("天地图 API 加载成功");
      resolve();
    };

    script.onerror = () => {
      console.error("天地图 API 加载失败");
      reject(new Error("天地图 API 加载失败"));
    };

    document.head.appendChild(script);
  });
}
onMounted(() => {
  loadTianDiTuAPI();
});

onMounted(async () => {
  if (!currentTravel.value) {
    router.push({ name: "CreateTravel" });
  }
});

// 新增：定义控制动作面板显示的响应式变量
const showActionSheet = ref(false);

const moreActions = [
  {
    name: "创建旅行",
    color: "green",
    callback: () => {
      router.push({ name: "CreateTravel" });
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
      class="w-full h-full overflow-auto rounded-lg shadow-lg thin-scrollbar"
    >
      <van-tabs
        v-model:active="activeTab"
        background="linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)"
        color="#fff"
        title-active-color="#fff"
        title-inactive-color="rgba(255,255,255,0.7)"
        sticky
        shrink
        animated
        :offset-top="46"
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
          name="fee"
          class="w-full h-full overflow-hidden"
          >内容 2</van-tab
        >
        <van-tab
          title="统计"
          name="statistic"
          class="w-full h-full overflow-hidden"
          >内容 3</van-tab
        >
      </van-tabs>
    </div>
    <van-floating-bubble
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

<style scoped>
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
</style>
