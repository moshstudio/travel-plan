<script setup lang="ts">
import { useStore } from "@/store";
import { ref, toRaw, onActivated, onMounted } from "vue";
import { Map, Overlay, View } from "ol";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import TileLayer from "ol/layer/Tile";
import { XYZ } from "ol/source";
import { tdtDrivePath, tdtXYZPoxyCVAUrl, tdtXYZPoxyVECUrl } from "@/api/tdt";
import { fromLonLat, toLonLat } from "ol/proj";
import { defaults } from "ol/control";
import _ from "lodash";
import OlPopup from "@/components/map/OlPopup.vue";
import { TravelPlanType } from "@/data/TravelPlan";
import { storeToRefs } from "pinia";
import { useRoute } from "vue-router";
import VectorLayer from "ol/layer/Vector";
import { Fill, Stroke, Style } from "ol/style";
import CircleStyle from "ol/style/Circle";
import VectorSource from "ol/source/Vector";
import { sleep } from "@/utils";
import pWaitFor from "p-wait-for";
import { getPlanPriorityColor, getPlanStatusColor } from "@/utils/planUtils";
import { simplifyLineString } from "@/utils/map/mapUtil";
import { RouteDrawer } from "@/components/map/MyLineString";
import { TDTDrivePath } from "@/data/drivePath";

const route = useRoute();
const store = useStore();
const { currentTravel, travelPlans } = storeToRefs(store);

const mapContainer = ref<HTMLElement>();
const map = ref<Map>();
const lineLayer = ref<VectorLayer>();
const pointLayer = ref<VectorLayer>();
const routeDrawers = ref<RouteDrawer[]>([]);

async function mapInit() {
  lineLayer.value = new VectorLayer({
    source: new VectorSource(),
  });
  pointLayer.value = new VectorLayer({
    source: new VectorSource(),
  });
  map.value = new Map({
    target: "sharePlanMap",
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
}

const loadPlanPositions = async () => {
  if (!map.value) return;
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
    travelPlans.value?.map(async (plan, index) => {
      if (index > 0 && travelPlans.value) {
        const startPlan = travelPlans.value[index - 1];
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
  travelPlans.value?.forEach((plan, index) => {
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
  if (pointLayer.value?.getSource()?.getExtent()) {
    map.value.getView().fit(pointLayer.value.getSource()!.getExtent(), {
      padding: [80, 80, 80, 80], // 上下左右留白
      duration: 1000, // 动画持续时间
    });
  }
};
const setOverlay = async (overlay: Overlay, plan: TravelPlanType) => {
  try {
    await pWaitFor(() => map.value !== undefined, {
      interval: 100,
      timeout: 3000,
    });
    await sleep(1000);
    map.value?.addOverlay(overlay);
    overlay.setPosition(
      fromLonLat([plan.location.coordinates.lng, plan.location.coordinates.lat])
    );
  } catch (error) {
    console.warn(error);
  }
};

// 计算同位置Popup数量
const getPopupCount = (
  position: { lng: number; lat: number },
  travelPlanId: string
) => {
  const list = travelPlans.value?.filter(
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
  loadPlanPositions();
});
</script>

<template>
  <div
    ref="sharePlanMap"
    class="relative w-full h-full flex flex-col overflow-hidden"
  >
    <div
      id="sharePlanMap"
      class="w-screen h-screen"
    ></div>
    <OlPopup
      v-for="(plan, index) in travelPlans"
      :key="plan.travelPlanId"
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
    ></OlPopup>
  </div>
</template>

<style scoped lang="less"></style>
