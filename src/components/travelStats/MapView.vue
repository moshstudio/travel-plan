<script setup lang="ts">
import { ref, onMounted, nextTick, watch } from "vue";
import "ol/ol.css";
import "ol-ext/dist/ol-ext.css";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import { fromLonLat, toLonLat } from "ol/proj";
import { TravelPlanStatus, TravelPlanType } from "@/data/TravelPlan";
import Placemark from "ol-ext/overlay/Placemark";
import Popup from "ol-ext/overlay/Popup";
import _ from "lodash";
import { format as fnsFormat } from "date-fns";
import { XYZ } from "ol/source";
import { tdtXYZPoxyCVAUrl, tdtXYZPoxyVECUrl } from "@/api/tdt";

const props = defineProps<{
  plans: TravelPlanType[];
  travelId: string;
}>();

const mapElement = ref<HTMLElement | null>(null);
const map = ref<Map>();
const popup = ref<Popup>();
const placemarks = ref<Placemark[]>([]);

// Priority to color mapping
const priorityColors = {
  low: "#4CAF50", // Green
  medium: "#FFC107", // Amber
  high: "#F44336", // Red
};

// Status to color mapping (for completed/cancelled plans)
const statusColors = {
  completed: "#9E9E9E", // Grey
  cancelled: "#607D8B", // Blue Grey
  expired: "#795548", // Brown
  default: "#2196F3", // Blue (default for active plans)
};

const tagIcons: Record<string, string> = {
  飞机出行: "fa fa-plane",
  高铁出行: "fa fa-train",
  自驾游: "fa fa-car",
  租车服务: "fa fa-car",
  酒店住宿: "fa fa-bed",
  特色民宿: "fa fa-home",
  青旅体验: "fa fa-users",
  露营帐篷: "fa fa-fire",
  景区门票: "fa fa-ticket",
  导游服务: "fa fa-female",
  旅行保险: "fa fa-shield",
  行李托运: "fa fa-suitcase",
  机场接送: "fa fa-plane",
  当地美食: "fa fa-cutlery",
  美食街: "fa fa-road",
  特产购物: "fa fa-shopping-bag",
  景点拍照: "fa fa-camera",
  徒步路线: "fa fa-male",
  签证服务: "fa fa-book",
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

const mapInit = async () => {
  if (!mapElement.value) return;
  map.value = new Map({
    target: mapElement.value,
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
    overlays: [],
  });
  popup.value = new Popup({
    popupClass: "default",
    closeBox: true,
    onclose: () => {
      map.value?.getTargetElement().focus();
    },
  });
  map.value.addOverlay(popup.value);
};

const showPlanPopup = (plans: TravelPlanType[], position: number[]) => {
  if (!popup.value || plans.length === 0) return;

  // Sort plans by start time
  const sortedPlans = _.sortBy(plans, "startDateTime");

  // Create popup content
  let content = `<div class="plan-popup">`;

  if (plans.length > 1) {
    content += `<div class="popup-header">
      <h4>${plans.length}项计划</h4>
    </div>`;
  }

  content += `<div class="plan-list">`;

  sortedPlans.forEach((plan) => {
    const startTime = formatDateTime(plan.startDateTime);
    const endTime = formatDateTime(plan.endDateTime);

    // 根据状态确定颜色
    const color = getColorForPlan(plan);

    content += `
      <div class="plan-item" data-plan-id="${plan.travelPlanId}">
        <div class="plan-header">
          <span class="status-dot" style="background-color: ${color}"></span>
          <h5>${plan.title}</h5>
          <span class="plan-status">${getStatusText(plan.status)}</span>
        </div>
        <div class="plan-time">
          <i class="fa fa-clock-o"></i> ${startTime} - ${endTime}
        </div>
        ${
          plan.description
            ? `<div class="plan-description">${plan.description}</div>`
            : ""
        }
        ${
          plan.tags?.length
            ? `
          <div class="plan-tags">
            ${plan.tags
              .map(
                (tag) => `
              <span class="plan-tag">
                <i class="${tagIcons[tag] || "fa fa-tag"}"></i> ${tag}
              </span>
            `
              )
              .join("")}
          </div>
        `
            : ""
        }
      </div>
      <hr class="plan-divider">
    `;
  });

  content += `</div></div>`;

  popup.value?.show(position, content);
  popup.value?.setPosition(position);
};

// 根据计划状态获取颜色
const getColorForPlan = (plan: TravelPlanType): string => {
  const now = Date.now();

  // 已完成或已取消的计划使用特定颜色
  if (plan.status === "completed") return statusColors.completed;
  if (plan.status === "cancelled") return statusColors.cancelled;

  // 已过期的计划
  if (plan.endDateTime < now) return statusColors.expired;

  // 活跃的计划使用优先级颜色
  return priorityColors[plan.priority] || statusColors.default;
};

// 获取状态文本
const getStatusText = (status: TravelPlanStatus): string => {
  const statusMap: Record<string, string> = {
    planning: "计划中",
    inProgress: "进行中",
    completed: "已完成",
    cancelled: "已取消",
  };
  return statusMap[status] || "";
};

const placemarksInit = () => {
  // Remove placemarks for plans that no longer exist
  [...placemarks.value].forEach((placemark) => {
    if (
      props.plans.findIndex((plan) =>
        placemark.getElement()?.className.includes(plan.travelPlanId)
      ) === -1
    ) {
      map.value?.removeOverlay(placemark as Placemark);
      _.remove(placemarks.value, placemark);
    }
  });

  // Group plans by location to handle multiple plans at same coordinates
  const plansByLocation = _.groupBy(
    props.plans,
    (plan) =>
      `${plan.location.coordinates.lng},${plan.location.coordinates.lat}`
  );

  // Add or update placemarks for current plans
  Object.entries(plansByLocation).forEach(([locationKey, plans]) => {
    const [lng, lat] = locationKey.split(",").map(Number);
    const lonlat = [lng, lat];
    const position = fromLonLat(lonlat);

    // Use the first plan's tag for the icon (or default if none)
    const firstPlan = plans[0];
    const content =
      firstPlan.tags?.length && tagIcons[firstPlan.tags[0]]
        ? `<i class="${tagIcons[firstPlan.tags[0]]}"></i>`
        : `<i class="fa fa-map-marker"></i>`;

    // 根据计划状态确定颜色
    const color = getColorForPlan(firstPlan);

    // For multiple plans at same location, use a different color
    const finalColor =
      plans.length > 1
        ? "#9C27B0" // Purple for multiple plans
        : color;

    // Check if we already have a placemark for any of these plans
    const existingIndex = placemarks.value.findIndex((placemark) =>
      plans.some((plan) =>
        placemark.getElement()?.className.includes(plan.travelPlanId)
      )
    );

    if (existingIndex === -1) {
      // Create new placemark
      const placemark = new Placemark({ color: finalColor });
      placemarks.value.push(placemark);
      map.value?.addOverlay(placemark);

      // Add all plan IDs to class name for reference
      placemark.setClassName(plans.map((p) => p.travelPlanId).join(" "));
      placemark.show(position, content);

      // Add click handler
      placemark.getElement()?.addEventListener("click", (e) => {
        e.stopPropagation();
        showPlanPopup(plans, position);
      });
    } else {
      // Update existing placemark
      const placemark = placemarks.value[existingIndex];
      placemark.setColor(finalColor);
      placemark.show(position, content);

      // Update class names
      placemark.setClassName(plans.map((p) => p.travelPlanId).join(" "));
    }
  });

  // Center map on last plan if available
  if (props.plans.length) {
    const lastPlan = props.plans[props.plans.length - 1];
    const lonlat = [
      lastPlan.location.coordinates.lng,
      lastPlan.location.coordinates.lat,
    ];
    map.value?.setView(
      new View({
        center: fromLonLat(lonlat),
        zoom: 12,
      })
    );
  }
};

watch(
  () => props.plans,
  () => {
    placemarksInit();
  },
  { deep: true }
);

onMounted(async () => {
  await nextTick();
  await mapInit();
  await placemarksInit();
});
</script>

<template>
  <div
    ref="mapElement"
    class="w-full h-full"
  ></div>
</template>

<style scoped lang="less">
:deep(.ol-popup) {
  max-width: 80%;
}
:deep(.ol-popup-content) {
  display: flex;
  justify-content: center;
  align-items: center;
}

:deep(.plan-popup) {
  max-width: 100%;
  max-height: 400px;
  overflow-y: auto;
  padding: 1px;

  .popup-header {
    margin-bottom: 4px;
    text-align: center;
  }

  .plan-list {
    .plan-item {
      padding: 8px 0;
      cursor: pointer;

      &:hover {
        background-color: #f5f5f5;
      }
    }

    .plan-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;

      .status-dot {
        display: inline-block;
        width: 10px;
        height: 10px;
        border-radius: 50%;
      }

      .plan-status {
        margin-left: auto;
        font-size: 0.8em;
        color: #666;
      }
    }

    .plan-time {
      font-size: 0.8em;
      color: #666;
      margin: 4px 0;
    }

    .plan-description {
      font-size: 0.9em;
      margin: 4px 0;
      color: #444;
    }

    .plan-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 6px;

      .plan-tag {
        font-size: 0.7em;
        background-color: #e0e0e0;
        padding: 2px 6px;
        border-radius: 4px;
        display: flex;
        align-items: center;
        gap: 4px;
      }
    }

    .plan-actions {
      margin-top: 8px;
      display: flex;
      justify-content: flex-end;

      .nav-button {
        background-color: #2196f3;
        color: white;
        border: none;
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 0.8em;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 4px;

        &:hover {
          background-color: #0b7dda;
        }

        i {
          font-size: 0.9em;
        }
      }
    }
  }

  .plan-divider {
    margin: 8px 0;
    border: none;
    border-top: 1px solid #eee;
  }
}
</style>
