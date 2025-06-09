<script setup lang="ts">
import router from "@/router";
import { useStore } from "@/store";
import { ref, toRaw, onActivated, onMounted, computed } from "vue";
import { Map, Overlay, View } from "ol";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import TileLayer from "ol/layer/Tile";
import { XYZ } from "ol/source";
import {
  getLngLatAddress,
  tdtDrivePath,
  tdtSearch,
  tdtXYZPoxyCVAUrl,
  tdtXYZPoxyVECUrl,
} from "@/api/tdt";
import { fromLonLat, toLonLat } from "ol/proj";
import { defaults } from "ol/control";
import { AddressType } from "@/data/address";
import _ from "lodash";
import TravelTagSelector from "@/components/plan/TravelTagSelector.vue";
import TimeSelector from "@/components/plan/TimeSelector.vue";
import TrippleToggle from "@/components/plan/TrippleToggle.vue";
import DescribeInput from "@/components/plan/DescribeInput.vue";
import DurationSelect from "@/components/plan/DurationSelect.vue";
import LocationButton from "@/components/map/LocationButton.vue";
import CompassButton from "@/components/map/CompassButton.vue";
import ZoomButton from "@/components/map/ZoomButton.vue";
import Placemark from "@/components/map/Placemark.vue";
import OlPopup from "@/components/map/OlPopup.vue";
import { TravelPlanStatus, TravelPlanType } from "@/data/TravelPlan";
import { storeToRefs } from "pinia";
import { showConfirmDialog, showFailToast, showSuccessToast } from "vant";
import { useRoute } from "vue-router";
import { Coordinate } from "ol/coordinate";
import VectorLayer from "ol/layer/Vector";
import { Fill, Stroke, Style } from "ol/style";
import CircleStyle from "ol/style/Circle";
import VectorSource from "ol/source/Vector";
import { sleep } from "@/utils";
import pWaitFor from "p-wait-for";
import {
  getPlanPriorityColor,
  getPlanStatusColor,
  getPlanStatusText,
} from "@/utils/planUtils";
import { mapSetViewOffset, simplifyLineString } from "@/utils/map/mapUtil";
import { routerBack } from "@/utils";
import { RouteDrawer } from "@/components/map/MyLineString";
import { TDTDrivePath } from "@/data/drivePath";

const route = useRoute();
const store = useStore();
const { currentTravel, travelPlans } = storeToRefs(store);

const sortedPlans = computed(() => {
  const today = new Date(Date.now()).setHours(0, 0, 0, 0);
  return _.orderBy(
    travelPlans.value?.filter(
      (plan) => plan.startDateTime >= today || plan.endDateTime >= today
    ),
    ["startDateTime", "endDateTime"],
    ["asc", "asc"]
  );
});

const travelPlanId = ref<string | undefined>();
const getTravelPlanById = (id?: string) => {
  if (!id) return;
  return sortedPlans.value?.find((plan) => plan.travelPlanId === id);
};
const selectedPlan = ref<TravelPlanType>();

const mapContainer = ref<HTMLElement>();
const map = ref<Map>();
const lineLayer = ref<VectorLayer>();
const pointLayer = ref<VectorLayer>();
const popupOverlays = ref<Overlay[]>([]);
const showPopups = ref(true);
const routeDrawers = ref<RouteDrawer[]>([]);

const searchValue = ref("");
const selectedAddress = ref<AddressType>();
const showSelectedAddressInfo = ref(false);
const addressOptions = ref<AddressType[]>([]);
const showAddressOptions = ref(false);
const selectedTags = ref<string[]>([]);
const selectedDatetime = ref(new Date(Date.now()));
const predictDuration = ref(2);
const priority = ref<"low" | "medium" | "high">("medium");
const describe = ref("");

const initParamsToPlan = (plan: TravelPlanType) => {
  if (plan.tags) {
    selectedTags.value = [...plan.tags];
  }
  selectedDatetime.value = new Date(plan.startDateTime);
  predictDuration.value = Number(
    ((plan.endDateTime - plan.startDateTime) / 1000 / 60 / 60).toFixed(1)
  );
  priority.value = plan.priority;
  if (plan.description) {
    describe.value = plan.description;
  }
  selectedAddress.value = plan.location;
  showSelectedAddressInfo.value = true;
  travelPlanId.value = plan.travelPlanId;
  selectedPlan.value = plan;
  mapSetViewOffset(
    map.value,
    plan.location.coordinates.lng,
    plan.location.coordinates.lat,
    map.value?.getView().getZoom() || 14
  );
};

async function mapInit() {
  lineLayer.value = new VectorLayer({
    source: new VectorSource(),
  });
  pointLayer.value = new VectorLayer({
    source: new VectorSource(),
  });
  map.value = new Map({
    target: "createPlanMap",
    layers: [
      new TileLayer({
        source: new XYZ({
          crossOrigin: "anonymous",
          url: await tdtXYZPoxyVECUrl(),
          maxZoom: 17,
        }),
      }),
      new TileLayer({
        source: new XYZ({
          crossOrigin: "anonymous",
          url: await tdtXYZPoxyCVAUrl(),
          maxZoom: 17,
        }),
      }),
      pointLayer.value,
    ],
    view: new View({
      center: fromLonLat([116.3976, 39.9035]), // 北京
      zoom: 14,
      projection: "EPSG:3857",
    }),
    overlays: [],
    controls: defaults({
      zoom: false,
      rotate: false,
    }),
  });
  map.value.addLayer(lineLayer.value);

  // locationButton.value.on("position" as any, async function (e: any) {
  //   if (e.coordinate) {
  //     showPosition(e.coordinate);
  //   }
  // });
  map.value.on("click", async function (e) {
    showPosition(e.coordinate);
  });
}

const showPosition = async (coordinate: Coordinate, plan?: TravelPlanType) => {
  showAddressOptions.value = false;
  const lnglat = toLonLat(coordinate);
  if (plan) {
    travelPlanId.value = plan.travelPlanId;
    selectedPlan.value = getTravelPlanById(plan.travelPlanId);
  } else {
    const addedPositions = sortedPlans.value?.filter(
      (item) =>
        item.location.coordinates.lng === lnglat[0] &&
        item.location.coordinates.lat === lnglat[1]
    );
    travelPlanId.value = travelPlanId.value
      ? addedPositions?.find((item) => item.travelPlanId === travelPlanId.value)
          ?.travelPlanId
      : addedPositions?.[0]?.travelPlanId;
    selectedPlan.value = getTravelPlanById(travelPlanId.value);
  }
  if (selectedPlan.value) {
    // 编辑计划
    initParamsToPlan(selectedPlan.value);
  } else {
    // 创建计划
    const address = await getLngLatAddress({ lng: lnglat[0], lat: lnglat[1] });
    if (address) {
      searchValue.value = address.address;
      selectedAddress.value = address;
      showSelectedAddressInfo.value = true;
      mapSetViewOffset(
        map.value,
        lnglat[0],
        lnglat[1],
        map.value?.getView().getZoom() || 14
      );
    }
  }
};

const onSearch = async (value: string) => {
  if (!value) return;
  addressOptions.value = [];
  const center = map.value?.getView().getCenter();

  if (center) {
    addressOptions.value = await tdtSearch(
      value,
      "10000",
      `${toLonLat(center)[0].toFixed(3)},${toLonLat(center)[1].toFixed(3)}`
    );
  } else {
    addressOptions.value = await tdtSearch(value);
  }

  showAddressOptions.value = true;
  searchValue.value = value;
};
const debounceOnSearch = _.debounce(onSearch, 500);

async function selectAddressOption(address: AddressType) {
  searchValue.value = address.name;
  selectedAddress.value = address;
  selectedPlan.value = undefined;
  showSelectedAddressInfo.value = true;
  mapSetViewOffset(
    map.value,
    address.coordinates.lng,
    address.coordinates.lat,
    map.value?.getView().getZoom() || 14
  );

  addressOptions.value = [];
  showAddressOptions.value = false;
}

async function clearSelected() {
  searchValue.value = "";
  showAddressOptions.value = false;
}

async function onCreatePlan() {
  if (!currentTravel.value) {
    showConfirmDialog({
      title: "提示",
      message: "您还没有创建任何旅行，是否立即创建?",
      confirmButtonText: "创建旅行",
      cancelButtonText: "取消",
    }).then(() => {
      router.push({ name: "CreateTravel" });
    });
    return;
  }
  if (!selectedAddress.value) {
    showFailToast("请选择地点");
    return;
  }
  if (!selectedPlan.value) {
    // 创建
    const planData: Omit<TravelPlanType, "id" | "travelPlanId"> = {
      travelId: currentTravel.value.travelId,
      description: describe.value,
      startDateTime: selectedDatetime.value.getTime(),
      endDateTime:
        selectedDatetime.value.getTime() +
        predictDuration.value * 60 * 60 * 1000,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      status: TravelPlanStatus.planned,
      priority: priority.value,
      tags: toRaw(selectedTags.value),
      location: toRaw(selectedAddress.value),
      version: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    showSelectedAddressInfo.value = false;
    manualClearOverlays();
    showPopups.value = false;
    const addedPlan = await store.addTravelPlan(planData);
    if (addedPlan) {
      showSuccessToast("计划创建成功");
      travelPlanId.value = addedPlan.travelPlanId;
      selectedPlan.value = addedPlan;
      describe.value = "";
      showSelectedAddressInfo.value = false;
      await sleep(500);
      showPopups.value = true;
      loadPlanPositions();
    }
  } else {
    // 更新
    const planData: TravelPlanType = {
      id: selectedPlan.value.id,
      travelId: currentTravel.value.travelId,
      travelPlanId: selectedPlan.value.travelPlanId,
      description: describe.value,
      startDateTime: selectedDatetime.value.getTime(),
      endDateTime:
        selectedDatetime.value.getTime() +
        predictDuration.value * 60 * 60 * 1000,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      status: TravelPlanStatus.planned,
      priority: priority.value,
      tags: toRaw(selectedTags.value),
      location: toRaw(selectedAddress.value),
      version: 1,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    manualClearOverlays();
    showPopups.value = false;
    await store.updateTravelPlan(planData);
    showSuccessToast("计划更新成功");
    showSelectedAddressInfo.value = false;
    describe.value = "";
    await sleep(500);
    showPopups.value = true;
    loadPlanPositions();
  }
}

async function onDeletePlan() {
  if (!selectedPlan.value) return;
  showConfirmDialog({
    title: "提示",
    message: `确定删除该计划吗？\n${
      selectedPlan.value.title || selectedPlan.value.location.name
    }`,
    confirmButtonText: "删除",
    cancelButtonText: "取消",
  }).then(async () => {
    if (!selectedPlan.value) return;
    manualClearOverlays();
    showPopups.value = false;
    await store.deleteTravelPlan(selectedPlan.value);
    showSuccessToast("计划删除成功");
    showSelectedAddressInfo.value = false;
    await sleep(1000);
    showPopups.value = true;
    loadPlanPositions();
  });
}

const loadPlanPositions = async (keepPosition = true) => {
  if (!map.value) return;
  const originCenter = map.value?.getView().getCenter();
  if (pointLayer.value) {
    pointLayer.value.getSource()?.clear();
  }
  if (lineLayer.value) {
    lineLayer.value.getSource()?.clear();
  }
  routeDrawers.value = [];
  // 画线
  const drivePaths: {
    startPlan: TravelPlanType;
    endPlan: TravelPlanType;
    path: TDTDrivePath;
  }[] = [];
  await Promise.all(
    sortedPlans.value?.map(async (plan, index) => {
      if (index > 0 && sortedPlans.value) {
        const startPlan = sortedPlans.value[index - 1];
        const endPlan = plan;
        const path = await tdtDrivePath(
          {
            lng: startPlan.location.coordinates.lng,
            lat: startPlan.location.coordinates.lat,
          },
          {
            lng: endPlan.location.coordinates.lng,
            lat: endPlan.location.coordinates.lat,
          }
        );
        if (path) {
          drivePaths.push({ startPlan, endPlan, path });
        }
      }
    }) || []
  );
  drivePaths.forEach((drivePath) => {
    const simplifyPath =
      drivePath.path.routelatlon.length > 10
        ? simplifyLineString(drivePath.path.routelatlon)
        : drivePath.path.routelatlon;
    if (!map.value || !lineLayer.value) return;
    const routeDraw = new RouteDrawer({
      map: map.value,
      lineLayer: lineLayer.value,
      color: getPlanPriorityColor(drivePath.startPlan.priority),
    });
    routeDrawers.value.push(routeDraw);
    routeDraw.drawRoute(simplifyPath);
  });

  //画位置
  const features: Feature<Point>[] = [];
  sortedPlans.value?.forEach((plan, index) => {
    const point = new Point(
      fromLonLat([plan.location.coordinates.lng, plan.location.coordinates.lat])
    );
    const feature = new Feature({
      geometry: point,
    });
    feature.set("plan", plan);
    function createPointStyle(plan: TravelPlanType) {
      const color = getPlanPriorityColor(plan.priority);
      return new Style({
        image: new CircleStyle({
          radius: 5,
          fill: new Fill({
            color: color,
          }),
          stroke: new Stroke({
            color: "white",
            width: 2,
          }),
        }),
      });
    }
    feature.setStyle(createPointStyle(plan));
    features.push(feature);
  });
  pointLayer.value?.getSource()?.addFeatures(features);
  if (keepPosition && originCenter) {
    map.value?.setView(
      new View({
        center: originCenter,
        zoom: map.value?.getView()?.getZoom() || 14,
      })
    );
  }
};

const manualClearOverlays = () => {
  popupOverlays.value.forEach((overlay) => {
    map.value?.removeOverlay(overlay as Overlay);
  });
  popupOverlays.value = [];
};
const setOverlay = async (overlay: Overlay, plan: TravelPlanType) => {
  try {
    await pWaitFor(() => map.value !== undefined, {
      interval: 100,
      timeout: 3000,
    });
    await sleep(1000);
    if (!popupOverlays.value.includes(overlay)) {
      popupOverlays.value.push(overlay);
    }
    map.value?.addOverlay(overlay);
    overlay.setPosition(
      fromLonLat([plan.location.coordinates.lng, plan.location.coordinates.lat])
    );
  } catch (error) {
    console.warn(error);
  }
};
const handlePopupClick = (plan: TravelPlanType) => {
  travelPlanId.value = plan.travelPlanId;
  showPosition(
    fromLonLat([plan.location.coordinates.lng, plan.location.coordinates.lat]),
    plan
  );
};

// 计算同位置Popup数量
const getPopupCount = (
  position: { lng: number; lat: number },
  travelPlanId: string
) => {
  const list = sortedPlans.value?.filter(
    (e) =>
      e.location.coordinates.lng === position.lng &&
      e.location.coordinates.lat === position.lat
  );
  if (!list) return 0;
  return list.findIndex((e) => e.travelPlanId === travelPlanId);
};

onMounted(() => {
  mapContainer.value?.addEventListener("get-popup-count", (e: any) => {
    e.detail.count = getPopupCount(e.detail.position, e.detail.id);
  });
});

onActivated(async () => {
  if (!map.value) {
    await mapInit();
  }
  await sleep(200);
  loadPlanPositions(false);
  const travelplanId = route.query?.travelPlanId;
  if (travelplanId !== travelPlanId.value) {
    // 新的id重新加载
    const plan = store.getTravelPlanById(travelplanId as string);
    if (plan) {
      initParamsToPlan(plan);
    }
  }
});
</script>

<template>
  <div
    ref="mapContainer"
    class="relative w-full h-full flex flex-col overflow-hidden"
  >
    <div
      id="createPlanMap"
      class="w-screen h-screen"
    ></div>
    <template v-if="showPopups">
      <OlPopup
        v-for="(plan, index) in sortedPlans"
        :key="'olpopup' + plan.travelPlanId"
        :position="plan.location.coordinates"
        :visible="true"
        :id="plan.travelPlanId"
        :title="plan.title || plan.location.name"
        :description="plan.description"
        icon="iconamoon:location-duotone"
        icon-color="red"
        :repeat-offset="plan.description ? 40 : 20"
        :closable="false"
        :clickable="true"
        :shadow-color="getPlanStatusColor(plan.status)"
        :border-color="getPlanStatusColor(plan.status)"
        @overlay-created="(o) => setOverlay(o, plan)"
        @click="() => handlePopupClick(plan)"
      ></OlPopup>
    </template>

    <LocationButton
      :map="map"
      @position="(p) => showPosition(p)"
      class="absolute right-4 top-[80px]"
    />
    <ZoomButton
      :map="map"
      class="absolute right-4 top-[120px]"
    ></ZoomButton>
    <CompassButton
      :map="map"
      :rotation-threshold="0"
      class="absolute left-auto right-4 top-[200px]"
    ></CompassButton>
    <Placemark
      :map="map"
      :position="
        selectedAddress
          ? [selectedAddress.coordinates.lng, selectedAddress.coordinates.lat]
          : undefined
      "
      :visible="selectedAddress !== undefined"
    ></Placemark>

    <div
      class="absolute left-4 top-4 right-4 flex gap-0 rounded-2xl shadow z-[1001]"
    >
      <van-search
        v-model="searchValue"
        @update:model-value="debounceOnSearch"
        class="w-full"
        placeholder="搜索地点"
        show-action
        :clearable="false"
      >
        <template #left-icon>
          <div class="hidden"></div>
        </template>
        <template #left>
          <van-icon
            name="arrow-left"
            class="px-2 van-haptics-feedback bg-transparent"
            @click="routerBack"
          ></van-icon>
        </template>
        <template #right-icon>
          <van-icon
            v-if="searchValue.length > 0"
            name="clear"
            class="van-haptics-feedback bg-transparent"
            @click="clearSelected"
          ></van-icon>
        </template>
        <template #action>
          <div @click="onSearch(searchValue)">搜索</div>
        </template>
      </van-search>
    </div>
    <div
      v-if="showAddressOptions"
      class="absolute top-[50px] left-4 right-4 shadow-lg max-h-[260px] overflow-auto z-1001 thin-scrollbar bf-[var(--van-background)]"
    >
      <van-cell-group class="px-4">
        <van-cell
          v-for="(address, index) in addressOptions"
          :key="index"
          :title="address.name"
          :label="address.address"
          @click="selectAddressOption(address)"
          clickable
        >
        </van-cell>
      </van-cell-group>
    </div>
    <van-popup
      v-if="selectedAddress"
      v-model:show="showSelectedAddressInfo"
      position="bottom"
      z-index="1000"
      teleport="body"
      :overlay="false"
      closeable
      round
    >
      <div class="flex flex-col gap-1 p-4 pb-6 shadow">
        <h2 class="mr-6">{{ selectedAddress.name }}</h2>
        <p class="text-[var(--van-text-color-2)] text-sm">
          {{ selectedAddress.address }}
        </p>
        <p class="text-[var(--van-text-color-2)] text-xs">
          东经 {{ selectedAddress.coordinates.lng.toFixed(3) }} 北纬
          {{ selectedAddress.coordinates.lat.toFixed(3) }}
        </p>
        <div
          v-if="selectedPlan"
          class="inline-block"
        >
          <p
            class="border rounded-lg text-sm px-1 text-nowrap inline-block"
            :style="{ color: getPlanStatusColor(selectedPlan.status) }"
          >
            {{ getPlanStatusText(selectedPlan.status) }}
          </p>
        </div>
        <van-divider></van-divider>
        <TravelTagSelector
          v-bind:model-value="selectedTags"
        ></TravelTagSelector>
        <van-divider></van-divider>
        <TimeSelector
          v-model:model-value="selectedDatetime"
          @update:model-value="
            (v) => {
              selectedDatetime = v;
            }
          "
        ></TimeSelector>
        <van-divider></van-divider>
        <DurationSelect
          v-model:duration="predictDuration"
          :start-date-time="selectedDatetime"
        ></DurationSelect>
        <van-divider></van-divider>
        <TrippleToggle v-model="priority"></TrippleToggle>
        <van-divider></van-divider>
        <DescribeInput
          :describe="describe"
          @change="(v) => (describe = v)"
          label="备注"
        ></DescribeInput>
        <van-divider></van-divider>
        <div class="flex items-center justify-between">
          <van-icon
            v-if="selectedPlan"
            name="delete"
            color="red"
            class="van-haptics-feedback"
            @click="onDeletePlan"
          ></van-icon>
          <div class="flex-grow"></div>
          <van-button
            size="small"
            :type="selectedPlan ? 'success' : 'primary'"
            @click="onCreatePlan"
          >
            {{ selectedPlan ? "更新计划" : "创建计划" }}
          </van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<style scoped lang="less">
:deep(#createPlanMap .ol-zoom) {
  top: 60px;
  bottom: auto;
  left: 10px;
  right: auto;
}
:deep(.van-search) {
  padding: 0;
  border-radius: 10px;
  .van-search__content {
    padding: 0;
  }
}
:deep(.van-divider) {
  line-height: 2px;
  margin: 0;
}
</style>
