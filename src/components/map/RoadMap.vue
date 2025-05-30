<template>
  <div class="relative w-screen h-screen flex flex-col">
    <van-nav-bar
      title="路线图"
      left-arrow
      @click-left="$router.back()"
    >
      <template #right>
        <van-icon
          name="share"
          size="18"
          @click="showToast('分享功能未实现')"
          class="mr-2"
        />
      </template>
    </van-nav-bar>

    <div
      class="absolute z-10 top-12 left-0 right-0 flex justify-center pointer-events-none"
    >
      <!-- Summary Toggle -->
      <div
        class="bg-white bg-opacity-90 px-3 py-2 rounded-b-lg shadow-md flex items-center pointer-events-auto cursor-pointer hover:bg-opacity-100 transition"
        @click="showPlanList = !showPlanList"
      >
        <van-loading
          v-if="loading"
          type="spinner"
          size="20px"
          class="mr-2"
        />
        <span class="text-sm text-gray-700">{{ travelSummary }}</span>
        <van-icon
          :name="showPlanList ? 'arrow-up' : 'arrow-down'"
          class="ml-2 text-gray-500"
        />
      </div>

      <!-- Plan List -->
      <transition
        enter-active-class="transition-all duration-300 ease-out"
        enter-from-class="opacity-0 -translate-y-2"
        enter-to-class="opacity-100 translate-y-0"
        leave-active-class="transition-all duration-200 ease-in"
        leave-from-class="opacity-100 translate-y-0"
        leave-to-class="opacity-0 -translate-y-2"
      >
        <div
          v-if="showPlanList"
          class="absolute top-full left-0 right-0 mx-4 mt-1 bg-white rounded-b-lg shadow-lg overflow-hidden pointer-events-auto"
        >
          <div
            class="max-h-[60vh] overflow-y-auto thin-scrollbar divide-y divide-gray-100"
          >
            <div
              v-for="plan in sortedPlans"
              :key="plan.id"
              class="relative px-4 py-3 active:bg-gray-50 transition-colors cursor-pointer border-l-4"
              :style="{ borderLeftColor: getStatusColor(plan.status) }"
              @click="handlePlanClick(plan)"
            >
              <!-- Priority dot -->
              <div
                class="absolute top-3 right-3 w-2 h-2 rounded-full"
                :style="{ backgroundColor: getPriorityColor(plan.priority) }"
              ></div>

              <div class="flex justify-between items-start gap-2 pr-4">
                <h4 class="text-sm font-medium text-gray-900 truncate">
                  {{ plan.title }}
                </h4>
              </div>

              <div class="flex items-center mt-1 text-xs text-gray-500">
                <van-icon
                  name="clock-o"
                  class="mr-1 text-gray-400"
                />
                <span
                  >{{ formatDateTime(plan.startDateTime) }}-{{
                    formatDateTime(plan.endDateTime)
                  }}</span
                >
              </div>

              <div class="flex items-center mt-1 gap-2">
                <span
                  v-if="plan.tags?.length"
                  class="text-xs px-1.5 py-0.5 bg-gray-100 rounded"
                >
                  {{ plan.tags[0] }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </transition>
    </div>

    <div
      ref="mapContainer"
      class="travel-map w-full h-full"
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
    <!-- 控制栏 -->
    <div
      class="absolute left-1 bottom-1 p-1 bg-white shadow rounded flex flex-col gap-3 z-11 -space-y-px"
    >
      <van-icon
        name="replay"
        size="18"
        @click="refreshMap"
        class="van-haptics-feedback pb-1 border-b border-gray-300"
      />
      <van-icon
        :name="showPopups ? 'eye' : 'eye-o'"
        size="18"
        @click="togglePopups"
        class="van-haptics-feedback pb-1 border-b border-gray-300"
      />
      <van-icon
        :name="showLegend ? 'info' : 'info-o'"
        size="18"
        @click="toggleLegend"
        class="van-haptics-feedback"
      />
    </div>

    <!-- 图例 -->
    <div
      v-if="showLegend"
      class="absolute z-10 bottom-1 left-0 right-0 flex justify-center transition-all duration-300 pointer-events-none"
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
import tinyColor from "tinycolor2";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Icon, Style, Stroke } from "ol/style";
import Feature from "ol/Feature";
import { LineString, Point } from "ol/geom";
import Placemark from "ol-ext/overlay/Placemark";
import Select from "ol/interaction/Select";
import { fromLonLat, toLonLat } from "ol/proj";
import { useStore } from "@/store";
import { TravelPlanStatus, TravelPlanType } from "@/data/TravelPlan";
import { XYZ } from "ol/source";
import { tdtXYZPoxyCVAUrl, tdtXYZPoxyVECUrl } from "@/api/tdt";
import { sleep } from "@/utils";
import Popup from "ol-ext/overlay/Popup";
import { getVectorContext } from "ol/render";
import { StyleLike } from "ol/style/Style";
import RenderEvent from "ol/render/Event";
import { showFailToast, showToast } from "vant";
import { Icon as VanIcon, Button as VanButton } from "vant";
import { nanoid } from "nanoid";

const store = useStore();
const { travelPlansFromToday } = storeToRefs(store);

// 按开始时间排序的行程计划
const sortedPlans = ref<TravelPlanType[]>([]);

const showPopups = ref(true);
const showLegend = ref(false);
const showPlanList = ref(false);
const loading = ref(true);
const selectedRoute = ref<{
  startAddress: string;
  endAddress: string;
  distance: string;
  time: string;
} | null>(null);
const mapContainer = ref<HTMLElement | null>(null);
let map: Map | null = null;
let lineLayer: VectorLayer<VectorSource> | null = null;
const placemarks: Placemark[] = [];
const popups: Popup[] = [];
let detailPopup: Popup | null = null;
const arrowAnime = ref(true);
let routeUniqId = 0;

const loadSortedPlans = () => {
  if (!travelPlansFromToday.value) {
    sortedPlans.value = [];
  }
  sortedPlans.value = _.cloneDeep(travelPlansFromToday.value).sort(
    (a, b) => a.startDateTime - b.startDateTime
  );
};

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

const handlePlanClick = (plan: TravelPlanType) => {
  placemarks.forEach((placemark) => {
    if (placemark.get("travelPlanId") === plan.travelPlanId) {
      map?.setView(
        new View({
          center: placemark.getPosition(),
          zoom: 14,
        })
      );
    }
  });
};

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
const getStatusText = (status: TravelPlanStatus): string => {
  const statusMap: Record<string, string> = {
    planned: "计划中",
    upcoming: "即将开始",
    inProgress: "进行中",
    completed: "已完成",
    expired: "已结束",
    cancelled: "已取消",
    deleted: "已删除",
  };
  return statusMap[status] || "";
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

// 计算两点间距离(公里)
const calculateDistance = (
  coord1: { lng: number; lat: number },
  coord2: { lng: number; lat: number }
): string => {
  const [lng1, lat1] = [coord1.lng, coord1.lat];
  const [lng2, lat2] = [coord2.lng, coord2.lat];

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
    map.addEventListener("click", (event) => {
      showPlanList.value = false;
    });
    updateMap();
  } catch (error) {
    console.error("地图初始化失败:", error);
  } finally {
    loading.value = false;
  }
};

const renderDetailPopupHtml = (plan: TravelPlanType) => {
  const priorityColor = getPriorityColor(plan.priority);
  const statusText = getStatusText(plan.status);
  const statusColor = getStatusColor(plan.status);
  const timeDisplay = `${formatDateTime(plan.startDateTime)} - ${formatDateTime(
    plan.endDateTime
  )}`;
  const container = document.createElement("div");
  render(
    h("div", { class: "bg-white rounded-lg shadow p-3 w-64 text-sm" }, [
      h("div", { class: "flex justify-between items-center mb-2" }, [
        h(
          "h3",
          {
            class: "font-bold truncate",
            style: { color: priorityColor },
            title: plan.title,
          },
          plan.title
        ),
        h("div", { class: "flex items-center gap-1" }, [
          h(
            "span",
            {
              class: "text-xs px-2 py-0.5 rounded-full",
              style: {
                color: statusColor,
              },
            },
            statusText
          ),
          h(VanIcon, {
            name: "close",
            class: "detail-popup-close cursor-pointer",
          }),
        ]),
      ]),
      h("div", { class: "space-y-1 mb-2 text-gray-600" }, [
        h("div", { class: "flex items-center" }, [
          h("span", { class: "mr-2 text-xs" }, "🕒"),
          h("span", timeDisplay),
        ]),
        plan.location?.address &&
          h("div", { class: "flex items-center" }, [
            h("span", { class: "mr-2 text-xs" }, "📍"),
            h("span", plan.location.address),
          ]),
      ]),
      plan.description &&
        h("p", { class: "mb-2 text-gray-700" }, plan.description),
      (plan.tags?.length || 0) > 0 &&
        h(
          "div",
          { class: "flex flex-wrap gap-1 mb-2" },
          plan.tags!.map((tag) =>
            h(
              "span",
              {
                class: "bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded",
              },
              tag
            )
          )
        ),
    ]),
    container
  );
  // document
  //   .querySelector("." + closeButtonClass)
  //   ?.addEventListener("click", () => {
  //     console.log("关闭详情弹窗");
  //   });
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

  if (sortedPlans.value.length === 0) return;

  // 收集所有坐标点
  const coordinates: number[][] = [];
  const planIds: string[] = [];
  sortedPlans.value.forEach((plan) => {
    const coord = [
      plan.location.coordinates.lng,
      plan.location.coordinates.lat,
    ];
    coordinates.push(coord);
    planIds.push(plan.travelPlanId);
  });

  // 添加路径
  const lineFeatures: Feature[] = [];
  for (let i = 0; i < coordinates.length - 1; i++) {
    const startCoord = coordinates[i];
    const endCoord = coordinates[i + 1];
    const lineCoords = [fromLonLat(startCoord), fromLonLat(endCoord)];
    const linePlans = [planIds[i], planIds[i + 1]];
    const lineString = new LineString(lineCoords);

    const startPlan = sortedPlans.value[i];
    const endPlan = sortedPlans.value[i + 1];
    const dateColor = getColorForDate(
      endPlan.startDateTime ?? startPlan.startDateTime
    );

    // 定义样式
    const upperPathStyle = new Style({
      stroke: new Stroke({
        color: dateColor,
        width: 5,
      }),
    });
    const arrowCanvas = (function () {
      const opt = {
        color: "rgba(255,255,255,1)",
        lineWidth: 3,
        arrowHeight: 5,
        // 箭头夹角（度）
        angle: 110,
      };
      const singleHeight = opt.arrowHeight / 2;
      // 计算出箭头宽度
      // 计算余切值
      const cotA = 1 / Math.tan((opt.angle * Math.PI) / 360);
      // 使用余切值计算相邻直角边, 箭头偏移宽度
      const offsetWidth = Math.ceil(cotA * singleHeight);
      const arrowWidth = offsetWidth + opt.lineWidth;

      const canvas = document.createElement("canvas");
      canvas.width = arrowWidth;
      canvas.height = opt.arrowHeight;
      let ctx = canvas.getContext("2d", { willReadFrequently: true })!;
      ctx.fillStyle = opt.color;
      ctx.strokeStyle = opt.color;
      ctx.beginPath();
      ctx.lineTo(0, 0);
      ctx.lineTo(opt.lineWidth, 0);
      ctx.lineTo(arrowWidth, singleHeight);
      ctx.lineTo(opt.lineWidth, opt.arrowHeight);
      ctx.lineTo(0, opt.arrowHeight);
      ctx.lineTo(offsetWidth, singleHeight);
      ctx.closePath();
      ctx.fill();
      return canvas;
    })();
    const createArrowStyle = (
      resolution: number,
      offset: number,
      vectorContext?: any
    ) => {
      let resStyles: Style[] = [];
      let lineLength = lineString.getLength() / resolution;
      if (lineLength < 50) {
        return resStyles;
      }
      let numArr = Math.ceil(lineLength / 100);
      let points = [];
      for (let i = 0; i <= numArr; i++) {
        let fracPos = i / numArr + offset;
        if (fracPos > 1) fracPos -= 1;
        let pg = new Feature({
          geometry: new Point(lineString.getCoordinateAt(fracPos)),
        });
        points.push(pg);
      }
      //确定方向并绘制
      lineString.forEachSegment((start, end) => {
        let line = new LineString([start, end]);
        _.forEach(points, (point) => {
          let coord = point.getGeometry()!.getFirstCoordinate();
          let cPoint = line.getClosestPoint(coord);
          if (
            Math.abs(cPoint[0] - coord[0]) < 1 &&
            Math.abs(cPoint[1] - coord[1]) < 1
          ) {
            let dx = end[0] - start[0];
            let dy = end[1] - start[1];
            let rotation = Math.atan2(dy, dx);
            let arrowStyle = new Style({
              image: new Icon({
                img: arrowCanvas,
                anchor: [1, 0.5],
                rotateWithView: true,
                rotation: -rotation,
                width: arrowCanvas.width,
                height: arrowCanvas.height,
              }),
            });
            if (vectorContext) {
              vectorContext.drawFeature(point, arrowStyle);
            } else {
              arrowStyle.setGeometry(point.getGeometry()!);
              resStyles.push(arrowStyle);
            }
          }
        });
      });

      return resStyles;
    };

    const bottomPathStyle = new Style({
      stroke: new Stroke({
        color: tinyColor(dateColor).darken(20).toHslString(),
        width: 7,
      }),
    });
    const drawVectorFeature = (
      layer: VectorLayer<VectorSource>,
      object: {
        geom: LineString;
        style: StyleLike;
        kv?: Record<string, any>;
      }
    ) => {
      const geom = object.geom;
      let feature = new Feature({
        geometry: geom,
      });
      if (object.kv?.id) {
        feature.setId(object.kv.id);
      }
      if (object.style) {
        feature.setStyle(object.style);
      }
      if (object.kv) {
        Object.getOwnPropertyNames(object.kv).forEach(function (key) {
          feature.set(key, object.kv![key]);
        });
      }
      lineFeatures.push(feature);
      return feature;
    };
    drawVectorFeature(lineLayer, {
      geom: lineString,
      style: bottomPathStyle,
      kv: {
        travelPlanIds: linePlans,
      },
    });

    let uid = routeUniqId++;
    let styles: StyleLike = upperPathStyle;
    if (!arrowAnime.value) {
      styles = function (feature, resolution) {
        let lineLength = lineString.getLength() / resolution;
        let offset = 100 / lineLength / 2;
        let res = createArrowStyle(resolution, offset);
        res.push(upperPathStyle);
        return res;
      };
    }
    drawVectorFeature(lineLayer, {
      geom: lineString,
      style: styles,
      kv: { _uid_: uid, travelPlanIds: linePlans },
    });
    if (arrowAnime.value) {
      // 绘制箭头动画函数
      let offset = 0.01;
      const drawArrow = function (evt: RenderEvent) {
        var vct = getVectorContext(evt);
        const features = lineLayer!
          .getSource()!
          .getFeatures()
          .filter((f) => f.get("_uid_") === uid);

        if (!features.length) {
          lineLayer?.un("postrender", drawArrow);
          return;
        }

        let resolution = evt.frameState!.viewState.resolution;
        createArrowStyle(resolution, offset, vct);

        let lineLength = lineString.getLength() / resolution;
        offset = offset + 0.2 / lineLength;
        //复位
        if (offset >= 1) offset = 0.001;
        // 告诉地图执行动画
        evt.frameState!.animate = true;
      };
      lineLayer?.on("postrender", drawArrow);
    }
  }

  lineSource.addFeatures(lineFeatures);
  // 添加选择交互
  const select = new Select({
    layers: [lineLayer],
    hitTolerance: 5, // 增加点击容差，更容易选中线
    multi: false, // 不允许多选
    toggleCondition: undefined, // 禁用切换选择（每次点击都会触发）
    // condition: "click", // 使用click事件（不是singleclick）
    style: null, // 设置为null表示不应用任何选择样式
  });
  map.addInteraction(select);

  // 监听选择变化
  select.on("select", function (e) {
    if (e.selected.length > 0) {
      const feature = e.selected[0];
      handleLineClick(feature.get("travelPlanIds"));
      select.getFeatures().clear();
    }
  });

  sortedPlans.value.forEach((plan, index) => {
    const coord = coordinates[index];
    const nthIndex = coordinates
      .slice(0, index + 1)
      .filter((x) => x[0] === coord[0] && x[1] === coord[1]).length;
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
    popup.setPopupClass(`my-popup z-[20] p-0 pointer-event-none`); //bg-white/70 shadow-lg
    popup.set("travelPlanId", plan.travelPlanId);
    popup.setPositioning("top-center");
    popup.setOffset([
      Math.pow(-1, nthIndex) * (nthIndex - 1) * 10,
      Math.pow(-1, nthIndex) * -(nthIndex - 1) * 10,
    ]);
  });

  // 创建标记点
  sortedPlans.value.forEach((plan, index) => {
    const coord = coordinates[index];
    const nthIndex = coordinates
      .slice(0, index + 1)
      .filter((x) => x[0] === coord[0] && x[1] === coord[1]).length;

    const placemark = new Placemark({
      color: getStatusColor(plan.status),
    });
    map?.addOverlay(placemark);
    placemarks.push(placemark);
    placemark.set("travelPlanId", plan.travelPlanId);
    placemark.setClassName("z-[10] pointer-events-none");
    placemark.getElement()?.classList.add("my-placemark");
    placemark.getElement()?.classList.add("scale-[0.8]");
    placemark.getElement()?.classList.add("round-[99999]");
    placemark.getElement()?.classList.add("pointer-events-auto");
    placemark.setPosition(fromLonLat(coord));
    placemark.setOffset([
      Math.pow(-1, nthIndex) * (nthIndex - 1) * 12,
      Math.pow(-1, nthIndex) * -(nthIndex - 1) * 10,
    ]);
    placemark.show(
      fromLonLat(coord),
      `<div class="flex items-center justify-center text-black pointer-events-none cursor-pointer">${
        index + 1
      }</div>`
    );
    placemark.getElement()?.addEventListener("click", () => {
      const planId = placemark.get("travelPlanId");
      const plan = sortedPlans.value.find((x) => x.travelPlanId === planId);
      if (!plan) return;
      detailPopup?.setPosition(placemarks[index].getPosition());
      detailPopup?.show(
        placemarks[index].getPosition(),
        renderDetailPopupHtml(plan)
      );
      const closeButton = document.querySelector(".detail-popup-close");
      closeButton?.addEventListener("click", () => {
        detailPopup?.hide();
        detailPopup?.setPosition(undefined);
      });
    });
  });

  // 显示popup
  popups.forEach((popup, index) => {
    const planId = popup.get("travelPlanId");
    const plan = sortedPlans.value.find((x) => x.travelPlanId === planId);
    if (!plan) return;
    const c = tinyColor(getPriorityColor(plan.priority)).darken(20).toHex();
    popup.show(
      placemarks[index].getPosition()!,
      `<div class="font-bold text-xs pointer-events-none" style="color: #${c}">${plan.title}</div>`
    );
  });

  if (!detailPopup) {
    detailPopup = new Popup({
      popupClass: "default",
      closeBox: false,
      onclose: () => {
        map?.getTargetElement().focus();
      },
      autoPan: {
        animation: {
          duration: 500,
        },
      },
    });
    map?.addOverlay(detailPopup);
    detailPopup.setPopupClass(`my-detail-popup z-[30] p-0`);
  }

  const extension = lineLayer.getSource()?.getExtent();
  if (extension) {
    map?.getView().fit(extension, {
      duration: 1000,
      padding: [50, 50, 50, 50],
    });
  }
  if (!showPopups.value) {
    showPopups.value = true;
  }
};

const handleLineClick = async (planIds: string[]) => {
  if (!map || !lineLayer) return;
  const startPlan = sortedPlans.value.find(
    (plan) => plan.travelPlanId === planIds[0]
  );
  const endPlan = sortedPlans.value.find(
    (plan) => plan.travelPlanId === planIds[1]
  );
  if (!startPlan || !endPlan) {
    selectedRoute.value = null;
    showFailToast("未找到路线");
  }
  const startAddress = startPlan!.location.name;
  const endAddress = endPlan!.location.name;
  const distance = calculateDistance(
    startPlan!.location.coordinates,
    endPlan!.location.coordinates
  );
  const time = `${formatDateTime(startPlan!.startDateTime)} - ${formatDateTime(
    endPlan!.endDateTime
  )}`;
  selectedRoute.value = {
    startAddress: startAddress,
    endAddress: endAddress,
    distance,
    time,
  };
};

const togglePopups = () => {
  showPopups.value = !showPopups.value;
};

const toggleLegend = () => {
  showLegend.value = !showLegend.value;
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
  div {
    display: flex;
    flex-direction: column;
  }
}
:deep(.my-placemark) {
  cursor: pointer;
}
:deep(.ol-popup.placemark) {
  pointer-events: none;
}
</style>
