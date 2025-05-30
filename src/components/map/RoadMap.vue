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
import tinyColor from "tinycolor2";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Icon, Style, Text, Fill, Stroke, Circle } from "ol/style";
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
import { MapRenderEventTypes } from "ol/render/EventType";
import BaseEvent from "ol/events/Event";
import { showFailToast } from "vant";

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

const mapContainer = ref<HTMLElement | null>(null);
let map: Map | null = null;
let lineLayer: VectorLayer<VectorSource> | null = null;
const placemarks: Placemark[] = [];
const popups: Popup[] = [];
const arrowAnime = ref(true);
let routeUniqId = 0;

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
    const dateColor = getColorForDate(startPlan.startDateTime);

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
                // imgSize: [arrowCanvas.width, arrowCanvas.height],
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
      // layer.getSource()!.addFeature(feature);
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
    placemark.setClassName("my-placemark z-[10]");
    placemark.getElement()?.classList.add("scale-[0.8]");
    placemark.setPosition(fromLonLat(coord));
    placemark.setOffset([
      Math.pow(-1, nthIndex) * (nthIndex - 1) * 10,
      Math.pow(-1, nthIndex) * -(nthIndex - 1) * 10,
    ]);
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
    popup.setPopupClass(`my-popup z-[20] bg-white/70 shadow-lg p-1`);
    popup.setPositioning("top-left");
    popup.setOffset([
      Math.pow(-1, nthIndex) * (nthIndex - 1) * 10,
      Math.pow(-1, nthIndex) * -(nthIndex - 1) * 10,
    ]);
    popup.show(placemarks[index].getPosition()!, renderPopupHtml(plan));
  });

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
