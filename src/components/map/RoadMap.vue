<!-- <template>
  <div class="relative w-screen h-screen flex flex-col">
    <van-nav-bar
      title="路线图"
      left-arrow
      @click-left="$router.back()"
    >
      <template #right>
        <van-icon
          :name="showPopups ? 'eye-o' : 'closed-eye'"
          size="18"
          @click="togglePopups"
          class="mr-2"
        />
        <van-icon
          name="replay"
          size="18"
          @click="refreshMap"
        />
      </template>
    </van-nav-bar>

    <div class="absolute z-10 top-12 left-0 right-0 flex justify-center">
      <div
        class="bg-white bg-opacity-90 px-3 py-2 rounded-b-lg shadow-md flex items-center"
      >
        <van-loading
          v-if="loading"
          type="spinner"
          size="20px"
          class="mr-2"
        />
        <span class="text-sm text-gray-700">
          {{ travelSummary }}
        </span>
      </div>
    </div>

    <div
      ref="mapContainer"
      class="travel-map w-full h-full"
    ></div>

    <div class="absolute z-10 bottom-4 left-0 right-0 flex justify-center">
      <div
        class="grid grid-cols-3 max-w-[90vw] gap-[8px] bg-white bg-opacity-90 px-3 py-2 rounded-lg shadow-md"
      >
        <div
          class="flex items-center mb-1"
          v-for="(item, index) in legendItems"
          :key="index"
        >
          <div
            class="w-4 h-4 rounded-full mr-2"
            :style="{ backgroundColor: item.color }"
          ></div>
          <span class="text-xs">{{ item.label }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed, onActivated, h, render } from "vue";
import _ from "lodash";
import { storeToRefs } from "pinia";
import { format as fnsFormat } from "date-fns";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Icon, Style, Text, Fill, Stroke, Circle } from "ol/style";
import Feature from "ol/Feature";
import { LineString, Point } from "ol/geom";
import Placemark from "ol-ext/overlay/Placemark";
import { fromLonLat, toLonLat } from "ol/proj";
import { useStore } from "@/store";
import { TravelPlanStatus, TravelPlanType } from "@/data/TravelPlan";
import { XYZ } from "ol/source";
import { tdtXYZPoxyCVAUrl, tdtXYZPoxyVECUrl } from "@/api/tdt";
import { sleep } from "@/utils";
import Popup from "ol-ext/overlay/Popup";
import RouteArrow from "@/assets/images/route-arrow.png";

const store = useStore();
const { travelPlansFromToday } = storeToRefs(store);
const showPopups = ref(true);
const loading = ref(true);

// 计算旅行摘要信息
const travelSummary = computed(() => {
  if (sortedPlans.value.length === 0) return "暂无行程计划";

  const startDate = new Date(sortedPlans.value[0].startDateTime);
  const endDate = new Date(
    sortedPlans.value[sortedPlans.value.length - 1].endDateTime
  );

  return `行程: ${startDate.getMonth() + 1}月${startDate.getDate()}日 - ${
    endDate.getMonth() + 1
  }月${endDate.getDate()}日 | ${sortedPlans.value.length}个地点`;
});

// 生成图例项
const legendItems = computed(() => {
  return [
    { color: "oklch(70.7% 0.022 261.325)", label: "未开始" },
    { color: "oklch(85.2% 0.199 91.936)", label: "即将开始" },
    { color: "oklch(79.2% 0.209 151.711)", label: "进行中" },
    { color: "oklch(70.4% 0.191 22.216)", label: "已结束" },
    { color: "oklch(70.7% 0.165 254.624)", label: "已完成" },
    { color: "oklch(70.7% 0.022 261.325)", label: "已取消" },
  ];
});

// 按开始时间排序的行程计划
const sortedPlans = ref<TravelPlanType[]>([]);

const loadSortedPlans = () => {
  if (!travelPlansFromToday.value) {
    sortedPlans.value = [];
  }
  sortedPlans.value = _.cloneDeep(travelPlansFromToday.value).sort(
    (a, b) => a.startDateTime - b.startDateTime
  );
};

const getColorForDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  const day = date.getDate();
  const month = date.getMonth();
  const year = date.getFullYear();

  // 使用更复杂的哈希算法确保颜色分布均匀
  const hash = day + month * 31 + year * 365;

  // 使用黄金角分割法(137.5度)确保颜色差异最大化
  const hue = (hash * 137.5) % 360;

  // 莫兰迪色系参数 - 较低饱和度，较高亮度
  const saturation = 40 + (hash % 20); // 40-60% 饱和度
  const lightness = 65 + (hash % 10); // 65-75% 亮度

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

// 获取优先级颜色
const getPriorityColor = (priority: "low" | "medium" | "high"): string => {
  switch (priority) {
    case "high":
      return "#f87171"; // 红色
    case "medium":
      return "#fbbf24"; // 黄色
    case "low":
      return "#4ade80"; // 绿色
    default:
      return "#94a3b8"; // 默认灰色
  }
};

// 获取状态颜色
const getStatusColor = (status: TravelPlanStatus): string => {
  switch (status) {
    case "planned":
      return "oklch(70.7% 0.022 261.325)";
    case "upcoming":
      return "oklch(85.2% 0.199 91.936)";
    case "in-progress":
      return "oklch(79.2% 0.209 151.711)";
    case "expired":
      return "oklch(70.4% 0.191 22.216)";
    case "cancelled":
      return "oklch(70.7% 0.022 261.325)";
    case "completed":
      return "oklch(70.7% 0.165 254.624)";
    default:
      return "#94a3b8"; // 默认灰色
  }
};

// 格式化日期时间
const formatDateTime = (timestamp: number, format = "MM-dd HH:mm"): string => {
  return fnsFormat(new Date(timestamp), format);
};

const mapContainer = ref<HTMLElement | null>(null);
let map: Map | null = null;
let lineLayer: VectorLayer<VectorSource> | null = null;
const placemarks: Placemark[] = [];
const popups: Popup[] = [];

// 初始化地图
const initMap = async () => {
  if (!mapContainer.value) return;
  loading.value = true;

  try {
    // 创建地图
    map = new Map({
      target: mapContainer.value,
      layers: [
        new TileLayer({
          source: new XYZ({
            url: await tdtXYZPoxyVECUrl(),
            maxZoom: 17,
          }),
        }),
        new TileLayer({
          source: new XYZ({
            url: await tdtXYZPoxyCVAUrl(),
            maxZoom: 17,
          }),
        }),
      ],
      view: new View({
        center: fromLonLat([116.404, 39.915]), // 默认北京中心
        zoom: 12,
      }),
    });

    // 创建路线层
    lineLayer = new VectorLayer({
      source: new VectorSource(),
    });
    map.addLayer(lineLayer);
    updateMap();
  } catch (error) {
    console.error("地图初始化失败:", error);
  } finally {
    loading.value = false;
  }
};

const renderPopupHtml = (plan: TravelPlanType) => {
  const priorityColor = getPriorityColor(plan.priority);
  const vnode = h(
    "div",
    {
      class: "flex flex-col items-center justify-start text-sm p-0",
      style: { color: "black" },
    },
    [
      h(
        "div",
        {
          class: `font-bold text-xs flex w-full`,
          style: {
            color: priorityColor,
          },
        },
        plan.title
      ),
      h(
        "div",
        {
          class: "text-xs",
          style: {
            color: "grey",
          },
        },
        formatDateTime(plan.startDateTime)
      ),
      h(
        "div",
        {
          class: "text-xs",
          style: {
            color: "grey",
          },
        },
        formatDateTime(plan.endDateTime)
      ),
    ]
  );

  const container = document.createElement("div");
  render(vnode, container);
  return container.innerHTML;
};

// 更新地图数据
const updateMap = () => {
  if (!map || !lineLayer) return;

  const lineSource = lineLayer.getSource();
  if (!lineSource) return;
  // 清空之前的内容
  popups.forEach((popup) => {
    map?.removeOverlay(popup);
  });
  popups.length = 0;
  placemarks.forEach((placemark) => {
    map?.removeOverlay(placemark);
  });
  placemarks.length = 0;
  lineSource.clear();
  if (sortedPlans.value.length === 0) return;

  // 首先收集所有坐标点
  const coordinates: number[][] = [];
  sortedPlans.value.forEach((plan, _) => {
    const coord = [
      plan.location.coordinates.lng,
      plan.location.coordinates.lat,
    ];
    coordinates.push(coord);
  });

  // 添加路径
  const lineFeatures: Feature[] = [];
  // 然后创建连接线（只在相邻点之间创建）
  for (let i = 0; i < coordinates.length - 1; i++) {
    const startCoord = coordinates[i];
    const endCoord = coordinates[i + 1];
    const lineCoords = [fromLonLat(startCoord), fromLonLat(endCoord)];
    const lineString = new LineString(lineCoords);
    const lineFeature = new Feature({
      geometry: lineString,
    });
    const startPlan = sortedPlans.value[i];
    const dateColor = getColorForDate(startPlan.startDateTime);
    // 设置虚线样式
    lineFeature.setStyle((resolution, index) => {
      var geometry = lineFeature.getGeometry();
      if (!geometry) return;
      var length = geometry.getLength(); //获取线段长度
      var radio = (50 * index) / length;
      var dradio = 1; //投影坐标系，如3857等，在EPSG:4326下可以设置dradio=10000
      var styles = [
        new Style({
          stroke: new Stroke({
            color: `${dateColor}`,
            width: 6,
          }),
        }),
      ];
      const zoomLevel = map?.getView().getZoom() || 10;
      for (var i = 0; i <= 1; i += radio) {
        var arrowLocation = geometry.getCoordinateAt(i);
        geometry.forEachSegment(function (start, end) {
          if (start[0] == end[0] || start[1] == end[1]) return;
          var dx1 = end[0] - arrowLocation[0];
          var dy1 = end[1] - arrowLocation[1];
          var dx2 = arrowLocation[0] - start[0];
          var dy2 = arrowLocation[1] - start[1];
          if (dx1 != dx2 && dy1 != dy2) {
            if (
              Math.abs(dradio * dx1 * dy2 - dradio * dx2 * dy1) <
              0.005 / (zoomLevel < 10 ? 1 : (zoomLevel - 10) * 20 + 10)
            ) {
              var dx = end[0] - start[0];
              var dy = end[1] - start[1];
              var rotation = Math.atan2(dy, dx);
              styles.push(
                new Style({
                  geometry: new Point(arrowLocation),
                  image: new Icon({
                    src: RouteArrow,
                    anchor: [0.5, 0.5],
                    rotateWithView: false,
                    rotation: -rotation - Math.PI / 2,
                    opacity: 0.8,
                    scale: 0.3,
                  }),
                })
              );
            }
          }
        });
      }
      return styles;
    });
    lineFeatures.push(lineFeature);
  }
  // 添加所有路线（一次性添加）
  lineSource.addFeatures(lineFeatures);

  // 创建标记点
  sortedPlans.value.forEach((plan, index) => {
    const coord = coordinates[index];
    const placemark = new Placemark({
      color: getStatusColor(plan.status),
    });
    map?.addOverlay(placemark);
    placemarks.push(placemark);
    placemark.setClassName("my-placemark z-[10]");
    placemark.getElement()?.classList.add("scale-[0.8]");
    placemark.setPosition(fromLonLat(coord));
    placemark.show(
      fromLonLat(coord),
      `<div class="flex items-center justify-center text-black">${
        index + 1
      }</div>`
    );
    placemark.getElement()?.addEventListener("click", () => {
      if (popups[index]) {
        if (popups[index].getPosition()) {
          popups[index].setPosition(undefined);
          popups[index].hide();
        } else {
          popups[index].setPosition(placemarks[index].getPosition());
        }
      }
    });
  });

  sortedPlans.value.forEach((plan, index) => {
    const popup = new Popup({
      popupClass: "default",
      closeBox: false,
      onclose: () => {
        map?.getTargetElement().focus();
      },
      autoPan: {
        animation: {
          duration: 100,
        },
      },
    });
    map?.addOverlay(popup);
    popups.push(popup);
    popup.setPopupClass(`my-popup z-[20] bg-white/70 shadow-lg p-1`);
    popup.setPositioning("top-left");
    popup.show(placemarks[index].getPosition()!, renderPopupHtml(plan));
  });
  const extension = lineLayer.getSource()?.getExtent();
  if (extension) {
    map?.getView().fit(extension, {
      duration: 1000,
      padding: [50, 50, 50, 50],
    });
  }
};

const togglePopups = () => {
  showPopups.value = !showPopups.value;
};

const updatePopupVisibility = () => {
  if (!map) return;
  if (!showPopups.value) {
    popups.forEach((popup) => {
      popup.hide();
    });
  } else {
    const originPosition = map.getView();
    const view = {
      center: originPosition.getCenter(),
      zoom: originPosition.getZoom(),
      projection: "EPSG:3857",
    };
    popups.forEach((popup, index) => {
      popup.setPosition(placemarks[index].getPosition());
    });
    map.setView(new View(view));
  }
};

const refreshMap = () => {
  loadSortedPlans();
};

watch(sortedPlans, _.debounce(updateMap, 300), { deep: true });

watch(showPopups, () => {
  updatePopupVisibility();
});

onMounted(async () => {
  await sleep(500);
  console.log("initMap");
  await initMap();
  refreshMap();
});
onActivated(() => {
  updateMap();
});
</script>

<style scoped lang="less">
:deep(.ol-popup-content) {
  display: flex;
  align-items: center;
  justify-content: center;
}
:deep(.my-popup) {
  pointer-events: none;
  div {
    display: flex;
    flex-direction: column;
  }
}
</style> -->
<template>
  <div class="relative w-screen h-screen flex flex-col">
    <van-nav-bar
      title="路线图"
      left-arrow
      @click-left="$router.back()"
    >
      <template #right>
        <van-icon
          :name="showPopups ? 'eye-o' : 'closed-eye'"
          size="18"
          @click="togglePopups"
          class="mr-2"
        />
        <van-icon
          name="replay"
          size="18"
          @click="refreshMap"
          class="mr-2"
        />
      </template>
    </van-nav-bar>

    <div
      class="absolute z-10 top-12 left-0 right-0 flex justify-center pointer-events-none"
    >
      <div
        class="bg-white bg-opacity-90 px-3 py-2 rounded-b-lg shadow-md flex items-center"
      >
        <van-loading
          v-if="loading"
          type="spinner"
          size="20px"
          class="mr-2"
        />
        <span class="text-sm text-gray-700">
          {{ travelSummary }}
        </span>
      </div>
    </div>

    <div
      ref="mapContainer"
      class="travel-map w-full h-full"
      @click="handleMapClick"
    ></div>

    <!-- 路线详情弹窗 -->
    <div
      v-if="selectedRoute"
      class="absolute z-20 top-1/2 left-0 right-0 mx-4 transform -translate-y-1/2"
    >
      <div class="bg-white bg-opacity-90 rounded-lg shadow-lg p-3">
        <div class="flex justify-between items-center mb-2">
          <h3 class="text-sm font-bold">路线详情</h3>
          <van-icon
            name="cross"
            size="14"
            @click="selectedRoute = null"
          />
        </div>
        <div class="text-xs space-y-1">
          <div class="flex">
            <span class="text-gray-500 w-16">起点:</span>
            <span>{{ selectedRoute.startAddress || "未知地址" }}</span>
          </div>
          <div class="flex">
            <span class="text-gray-500 w-16">终点:</span>
            <span>{{ selectedRoute.endAddress || "未知地址" }}</span>
          </div>
          <div class="flex">
            <span class="text-gray-500 w-16">距离:</span>
            <span>{{ selectedRoute.distance }}公里</span>
          </div>
          <div class="flex">
            <span class="text-gray-500 w-16">时间:</span>
            <span>{{ selectedRoute.time }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 图例 -->
    <van-icon
      name="info"
      size="18"
      @click="toggleLegend"
      class="absolute left-2 bottom-10"
    />
    <div
      v-if="showLegend"
      class="absolute z-10 bottom-4 left-0 right-0 flex justify-center transition-all duration-300 pointer-events-none"
    >
      <div
        class="grid grid-cols-3 max-w-[90vw] gap-[8px] bg-white bg-opacity-90 px-3 py-2 rounded-lg shadow-md"
      >
        <div
          class="flex items-center mb-1"
          v-for="(item, index) in legendItems"
          :key="index"
        >
          <div
            class="w-4 h-4 rounded-full mr-2"
            :style="{ backgroundColor: item.color }"
          ></div>
          <span class="text-xs">{{ item.label }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed, onActivated, h, render } from "vue";
import _ from "lodash";
import { storeToRefs } from "pinia";
import { format as fnsFormat } from "date-fns";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Icon, Style, Text, Fill, Stroke, Circle } from "ol/style";
import Feature from "ol/Feature";
import { LineString, Point } from "ol/geom";
import Placemark from "ol-ext/overlay/Placemark";
import { fromLonLat, toLonLat } from "ol/proj";
import { useStore } from "@/store";
import { TravelPlanStatus, TravelPlanType } from "@/data/TravelPlan";
import { XYZ } from "ol/source";
import { tdtXYZPoxyCVAUrl, tdtXYZPoxyVECUrl } from "@/api/tdt";
import { sleep } from "@/utils";
import Popup from "ol-ext/overlay/Popup";
import RouteArrow from "@/assets/images/route-arrow.png";

const store = useStore();
const { travelPlansFromToday } = storeToRefs(store);
const showPopups = ref(true);
const showLegend = ref(false);
const loading = ref(true);
const selectedRoute = ref<{
  startAddress: string;
  endAddress: string;
  distance: string;
  time: string;
} | null>(null);

// 计算旅行摘要信息
const travelSummary = computed(() => {
  if (sortedPlans.value.length === 0) return "暂无行程计划";

  const startDate = new Date(sortedPlans.value[0].startDateTime);
  const endDate = new Date(
    sortedPlans.value[sortedPlans.value.length - 1].endDateTime
  );

  return `行程: ${startDate.getMonth() + 1}月${startDate.getDate()}日 - ${
    endDate.getMonth() + 1
  }月${endDate.getDate()}日 | ${sortedPlans.value.length}个地点`;
});

// 生成图例项
const legendItems = computed(() => {
  return [
    { color: "oklch(70.7% 0.022 261.325)", label: "未开始" },
    { color: "oklch(85.2% 0.199 91.936)", label: "即将开始" },
    { color: "oklch(79.2% 0.209 151.711)", label: "进行中" },
    { color: "oklch(70.4% 0.191 22.216)", label: "已结束" },
    { color: "oklch(70.7% 0.165 254.624)", label: "已完成" },
    { color: "oklch(70.7% 0.022 261.325)", label: "已取消" },
  ];
});

// 按开始时间排序的行程计划
const sortedPlans = ref<TravelPlanType[]>([]);

const loadSortedPlans = () => {
  if (!travelPlansFromToday.value) {
    sortedPlans.value = [];
  }
  sortedPlans.value = _.cloneDeep(travelPlansFromToday.value).sort(
    (a, b) => a.startDateTime - b.startDateTime
  );
};

const getColorForDate = (timestamp: number): string => {
  const date = new Date(timestamp);
  const day = date.getDate();
  const month = date.getMonth();
  const year = date.getFullYear();

  const hash = day + month * 31 + year * 365;
  const hue = (hash * 137.5) % 360;
  const saturation = 40 + (hash % 20);
  const lightness = 65 + (hash % 10);

  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

const getPriorityColor = (priority: "low" | "medium" | "high"): string => {
  switch (priority) {
    case "high":
      return "#f87171";
    case "medium":
      return "#fbbf24";
    case "low":
      return "#4ade80";
    default:
      return "#94a3b8";
  }
};

const getStatusColor = (status: TravelPlanStatus): string => {
  switch (status) {
    case "planned":
      return "oklch(70.7% 0.022 261.325)";
    case "upcoming":
      return "oklch(85.2% 0.199 91.936)";
    case "in-progress":
      return "oklch(79.2% 0.209 151.711)";
    case "expired":
      return "oklch(70.4% 0.191 22.216)";
    case "cancelled":
      return "oklch(70.7% 0.022 261.325)";
    case "completed":
      return "oklch(70.7% 0.165 254.624)";
    default:
      return "#94a3b8";
  }
};

const formatDateTime = (timestamp: number, format = "MM/dd HH:mm"): string => {
  const date = new Date(timestamp);

  if (date.getMinutes() === 0) {
    if (date.getHours() === 0) {
      format = format.replace(" HH:mm", "日").replace("/", "月");
    } else {
      format = format.replace(":mm", "点");
    }
  }
  return fnsFormat(new Date(timestamp), format);
};

const getAddressByLngLat = (lng: number, lat: number) => {
  return sortedPlans.value.find(
    (plan) =>
      plan.location.coordinates.lng === lng &&
      plan.location.coordinates.lat === lat
  )?.location.name;
};

// 计算两点间距离(公里)
const calculateDistance = (coord1: number[], coord2: number[]): string => {
  const [lng1, lat1] = coord1;
  const [lng2, lat2] = coord2;

  const R = 6371; // 地球半径(km)
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance.toFixed(1);
};

const mapContainer = ref<HTMLElement | null>(null);
let map: Map | null = null;
let lineLayer: VectorLayer<VectorSource> | null = null;
const placemarks: Placemark[] = [];
const popups: Popup[] = [];
const routeFeatures: Feature[] = [];

const initMap = async () => {
  if (!mapContainer.value) return;
  loading.value = true;

  try {
    map = new Map({
      target: mapContainer.value,
      layers: [
        new TileLayer({
          source: new XYZ({
            url: await tdtXYZPoxyVECUrl(),
            maxZoom: 17,
          }),
        }),
        new TileLayer({
          source: new XYZ({
            url: await tdtXYZPoxyCVAUrl(),
            maxZoom: 17,
          }),
        }),
      ],
      view: new View({
        center: fromLonLat([116.404, 39.915]),
        zoom: 12,
      }),
    });

    lineLayer = new VectorLayer({
      source: new VectorSource(),
    });
    map.addLayer(lineLayer);
    updateMap();
  } catch (error) {
    console.error("地图初始化失败:", error);
  } finally {
    loading.value = false;
  }
};

const renderPopupHtml = (plan: TravelPlanType) => {
  const priorityColor = getPriorityColor(plan.priority);
  const vnode = h(
    "div",
    {
      class: "flex flex-col items-center justify-start text-sm p-0",
      style: { color: "black" },
    },
    [
      h(
        "div",
        {
          class: `font-bold text-xs flex w-full`,
          style: {
            color: priorityColor,
          },
        },
        plan.title
      ),
      h(
        "div",
        {
          class: "text-xs",
          style: {
            color: "grey",
          },
        },
        formatDateTime(plan.startDateTime)
      ),
      h(
        "div",
        {
          class: "text-xs",
          style: {
            color: "grey",
          },
        },
        formatDateTime(plan.endDateTime)
      ),
    ]
  );

  const container = document.createElement("div");
  render(vnode, container);
  return container.innerHTML;
};

const updateMap = async () => {
  if (!map || !lineLayer) return;

  const lineSource = lineLayer.getSource();
  if (!lineSource) return;

  // 清空之前的内容
  popups.forEach((popup) => {
    map?.removeOverlay(popup);
  });
  popups.length = 0;
  placemarks.forEach((placemark) => {
    map?.removeOverlay(placemark);
  });
  placemarks.length = 0;
  lineSource.clear();
  routeFeatures.length = 0;

  if (sortedPlans.value.length === 0) return;

  // 收集所有坐标点
  const coordinates: number[][] = [];
  sortedPlans.value.forEach((plan) => {
    const coord = [
      plan.location.coordinates.lng,
      plan.location.coordinates.lat,
    ];
    coordinates.push(coord);
  });

  // 添加路径
  const lineFeatures: Feature[] = [];
  for (let i = 0; i < coordinates.length - 1; i++) {
    const startCoord = coordinates[i];
    const endCoord = coordinates[i + 1];
    const lineCoords = [fromLonLat(startCoord), fromLonLat(endCoord)];
    const lineString = new LineString(lineCoords);
    const lineFeature = new Feature({
      geometry: lineString,
      startIndex: i,
      endIndex: i + 1,
      startCoord,
      endCoord,
    });

    const startPlan = sortedPlans.value[i];
    const dateColor = getColorForDate(startPlan.startDateTime);

    lineFeature.setStyle((resolution, index) => {
      var geometry = lineFeature.getGeometry();
      if (!geometry) return;
      var length = geometry.getLength();
      var radio = (50 * index) / length;
      var dradio = 1;
      var styles = [
        new Style({
          stroke: new Stroke({
            color: `${dateColor}`,
            width: 6,
          }),
        }),
      ];

      for (var i = 0; i <= 1; i += radio) {
        var arrowLocation = geometry.getCoordinateAt(i);
        geometry.forEachSegment(function (start, end) {
          if (start[0] == end[0] || start[1] == end[1]) return;
          var dx1 = end[0] - arrowLocation[0];
          var dy1 = end[1] - arrowLocation[1];
          var dx2 = arrowLocation[0] - start[0];
          var dy2 = arrowLocation[1] - start[1];
          if (dx1 != dx2 && dy1 != dy2) {
            if (Math.abs(dradio * dx1 * dy2 - dradio * dx2 * dy1) < 0.001) {
              var dx = end[0] - start[0];
              var dy = end[1] - start[1];
              var rotation = Math.atan2(dy, dx);
              styles.push(
                new Style({
                  geometry: new Point(arrowLocation),
                  image: new Icon({
                    src: RouteArrow,
                    anchor: [0.5, 0.5],
                    rotateWithView: false,
                    rotation: -rotation - Math.PI / 2,
                    opacity: 0.8,
                    scale: 0.3,
                  }),
                })
              );
            }
          }
        });
      }
      return styles;
    });

    lineFeatures.push(lineFeature);
    routeFeatures.push(lineFeature);
  }

  lineSource.addFeatures(lineFeatures);

  // 创建标记点
  sortedPlans.value.forEach((plan, index) => {
    const coord = coordinates[index];
    const placemark = new Placemark({
      color: getStatusColor(plan.status),
    });
    map?.addOverlay(placemark);
    placemarks.push(placemark);
    placemark.setClassName("my-placemark z-[10]");
    placemark.getElement()?.classList.add("scale-[0.8]");
    placemark.setPosition(fromLonLat(coord));
    placemark.show(
      fromLonLat(coord),
      `<div class="flex items-center justify-center text-black">${
        index + 1
      }</div>`
    );
    placemark.getElement()?.addEventListener("click", () => {
      if (popups[index]) {
        if (popups[index].getPosition()) {
          popups[index].setPosition(undefined);
          popups[index].hide();
        } else {
          popups[index].setPosition(placemarks[index].getPosition());
        }
      }
    });
  });

  sortedPlans.value.forEach((plan, index) => {
    const popup = new Popup({
      popupClass: "default",
      closeBox: false,
      onclose: () => {
        map?.getTargetElement().focus();
      },
      autoPan: {
        animation: {
          duration: 100,
        },
      },
    });
    map?.addOverlay(popup);
    popups.push(popup);
    popup.setPopupClass(`my-popup z-[20] bg-white/70 shadow-lg p-1`);
    popup.setPositioning("top-left");
    popup.show(placemarks[index].getPosition()!, renderPopupHtml(plan));
  });

  const extension = lineLayer.getSource()?.getExtent();
  if (extension) {
    map?.getView().fit(extension, {
      duration: 1000,
      padding: [50, 50, 50, 50],
    });
  }
};

const handleMapClick = async (event: MouseEvent) => {
  if (!map || !lineLayer) return;

  // 获取点击位置
  const pixel = map.getEventPixel(event);
  const features = map.getFeaturesAtPixel(pixel, {
    layerFilter: (layer) => layer === lineLayer,
    hitTolerance: 10,
  });

  if (features.length > 0) {
    const feature = features[0] as Feature & {
      getProperties(): {
        startIndex: number;
        endIndex: number;
        startCoord: number[];
        endCoord: number[];
      };
    };
    const { startIndex, endIndex, startCoord, endCoord } =
      feature.getProperties();

    try {
      // 获取起点和终点地址
      const [startAddress, endAddress] = await Promise.all([
        getAddressByLngLat(startCoord[0], startCoord[1]),
        getAddressByLngLat(endCoord[0], endCoord[1]),
      ]);

      // 计算距离
      const distance = calculateDistance(startCoord, endCoord);

      // 获取时间信息
      const startPlan = sortedPlans.value[startIndex];
      const endPlan = sortedPlans.value[endIndex];
      const time = `${formatDateTime(
        startPlan.startDateTime
      )} - ${formatDateTime(endPlan.endDateTime)}`;

      selectedRoute.value = {
        startAddress: startAddress || "未知地址",
        endAddress: endAddress || "未知地址",
        distance,
        time,
      };
    } catch (error) {
      console.error("获取路线详情失败:", error);
      selectedRoute.value = {
        startAddress: "未知地址",
        endAddress: "未知地址",
        distance: calculateDistance(startCoord, endCoord),
        time: `${formatDateTime(
          sortedPlans.value[startIndex].startDateTime
        )} - ${formatDateTime(sortedPlans.value[endIndex].endDateTime)}`,
      };
    }
  } else {
    selectedRoute.value = null;
  }
};

const togglePopups = () => {
  showPopups.value = !showPopups.value;
};

const toggleLegend = () => {
  showLegend.value = !showLegend.value;
  console.log(!showLegend.value);
};

const updatePopupVisibility = () => {
  if (!map) return;
  if (!showPopups.value) {
    popups.forEach((popup) => {
      popup.hide();
    });
  } else {
    const originPosition = map.getView();
    const view = {
      center: originPosition.getCenter(),
      zoom: originPosition.getZoom(),
      projection: "EPSG:3857",
    };
    popups.forEach((popup, index) => {
      popup.setPosition(placemarks[index].getPosition());
    });
    map.setView(new View(view));
  }
};

const refreshMap = () => {
  loadSortedPlans();
};

watch(sortedPlans, _.debounce(updateMap, 300), { deep: true });

watch(showPopups, () => {
  updatePopupVisibility();
});

onMounted(async () => {
  await sleep(500);
  await initMap();
  refreshMap();
});

onActivated(() => {
  updateMap();
});
</script>

<style scoped lang="less">
:deep(.ol-popup-content) {
  display: flex;
  align-items: center;
  justify-content: center;
}
:deep(.my-popup) {
  pointer-events: none;
  div {
    display: flex;
    flex-direction: column;
  }
}
:deep(.my-placemark) {
  cursor: pointer;
}
</style>
