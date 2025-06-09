<template>
  <div class="absolute top-4 right-4 z-[1000]">
    <van-icon
      name="location"
      class="text-[24px] text-blue-500 bg-white rounded-full p-2 shadow-md cursor-pointer transition-all duration-300 hover:bg-gray-100"
      :class="{ 'animate-pulse': isLocating }"
      @click="locateUser"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import "vant/es/icon/style";
import { Feature, Geolocation } from "ol";
import { Tile as TileLayer, Vector as VectorLayer } from "ol/layer";
import { Circle as CircleStyle, Fill, Stroke, Style } from "ol/style";
import Point from "ol/geom/Point";
import Circle from "ol/geom/Circle";
import type Map from "ol/Map";
import VectorSource from "ol/source/Vector";
import { Coordinate } from "ol/coordinate";

interface Props {
  map?: Map;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  (e: "position", coordinate: Coordinate, accuracy?: number): void;
}>();

const isLocating = ref(false);
const accuracyFeature = ref<Feature<Circle>>();
const positionFeature = ref<Feature<Point>>();
const geolocation = ref<Geolocation>();
const source = ref<VectorSource<any>>(new VectorSource());

// 定位样式
const createStyle = () => {
  return new Style({
    image: new CircleStyle({
      radius: 6,
      fill: new Fill({
        color: "#3399CC",
      }),
      stroke: new Stroke({
        color: "#fff",
        width: 2,
      }),
    }),
  });
};

// 精度样式
const createAccuracyStyle = () => {
  return new Style({
    fill: new Fill({
      color: "rgba(51, 153, 204, 0.2)",
    }),
    stroke: new Stroke({
      color: "rgba(51, 153, 204, 0.5)",
      width: 1.5,
    }),
  });
};

// 初始化定位功能
const startGeolocation = () => {
  if (!props.map) return;
  if (!geolocation.value) return;

  isLocating.value = true;
  const position = geolocation.value?.getPosition();
  const accuracy = geolocation.value?.getAccuracy();
  isLocating.value = false;

  if (position) {
    emit("position", position, accuracy);
    props.map?.getView().setCenter(position);
    props.map?.getView().setZoom(17);

    // 更新位置标记
    if (!positionFeature.value) {
      positionFeature.value = new Feature({
        geometry: new Point(position),
      });
      source.value.addFeature(positionFeature.value);
    } else {
      (positionFeature.value.getGeometry() as Point)?.setCoordinates(position);
    }

    // 更新精度圆
    if (!accuracyFeature.value && accuracy) {
      accuracyFeature.value = new Feature({
        geometry: new Circle(position, accuracy),
      });
      source.value.addFeature(accuracyFeature.value);
    } else if (accuracyFeature.value && accuracy) {
      const geometry = accuracyFeature.value.getGeometry() as Circle;
      geometry.setCenterAndRadius(position, accuracy);
    }

    // 设置样式
    positionFeature.value?.setStyle(createStyle());
    accuracyFeature.value?.setStyle(createAccuracyStyle());
  }
};

// 定位用户
const locateUser = () => {
  if (!props.map) return;

  isLocating.value = true;

  // 确保图层存在
  let layer = props.map
    .getLayers()
    .getArray()
    .find((l) => l.get("name") === "location");

  if (!layer) {
    layer = new VectorLayer({
      source: source.value as VectorSource,
    });
    layer.set("name", "location");
    props.map.addLayer(layer);
    geolocation.value = new Geolocation({
      trackingOptions: {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 60000,
      },
      projection: props.map.getView().getProjection(),
    });
    geolocation.value.on("error", (event) => {
      console.error("Geolocation error:", event.message);
      isLocating.value = false;
    });
    geolocation.value?.setTracking(true);
  }
  startGeolocation();
};
</script>
