<script setup lang="ts">
import "ol/ol.css";
import "ol-ext/dist/ol-ext.css";
import _ from "lodash";
import { useStore } from "@/store";
import { ref, onActivated, onMounted, computed, toRaw, triggerRef } from "vue";
import router from "@/router";
import { fromLonLat, toLonLat } from "ol/proj";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import XYZ from "ol/source/XYZ";
import Zoom from "ol/control/Zoom";
import {
  tdtXYZPoxyVECUrl,
  tdtXYZPoxyCVAUrl,
  getLngLatAddress,
  tdtSearch,
  getCurrentLngLat,
} from "@/api/tdt";

import Placemark from "ol-ext/overlay/Placemark";
import { MyLocationControl } from "./LocaltionControl";
import { AddressType } from "@/data/address";
import { TravelPlanType } from "@/data/TravelPlan";
import { useRoute } from "vue-router";

const planId = ref<string>();
const plan = ref<TravelPlanType>();
const store = useStore();
const route = useRoute();

const searchValue = ref("");
const map = ref<Map>();
const placemark = ref<Placemark>();
const locationButton = ref<MyLocationControl>();

const selectedAddress = ref<AddressType>();
const addressOptions = ref<AddressType[]>([]);
const showAddressOptions = ref(false);

const address = computed<AddressType | undefined>({
  get() {
    if (plan.value) {
      return plan.value.location;
    } else {
      return store.planSelectAddress;
    }
  },
  set(val) {
    if (!val) {
      return;
    }
    if (plan.value) {
      plan.value.location = val;
      store.updateTravelPlan(toRaw(plan.value));
    } else {
      store.planSelectAddress = val;
    }
  },
});

const loadData = async () => {
  if (route.params.travelPlanId) {
    planId.value = route.params.travelPlanId as string;
    plan.value = store.getTravelPlanById(planId.value);
  } else {
    planId.value = undefined;
    plan.value = undefined;
  }
  triggerRef(address);
};
const hideAddressOptions = () => {
  setTimeout(() => {
    showAddressOptions.value = false;
  }, 200);
};
async function mapInit() {
  placemark.value = new Placemark({
    color: "#369",
    contentColor: "#000",
    onshow: function (position) {},
  });
  locationButton.value = new MyLocationControl();
  map.value = new Map({
    target: "mapDiv",
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
      center: fromLonLat([116.3976, 39.9035]), // 北京
      zoom: 14,
      projection: "EPSG:3857",
    }),
    overlays: [placemark.value],
    controls: [locationButton.value, new Zoom()],
  });
  locationButton.value.on("position" as any, async function (e: any) {
    if (e.coordinate) {
      const lnglat = toLonLat(e.coordinate);
      const address = await getLngLatAddress({
        lng: lnglat[0],
        lat: lnglat[1],
      });
      placemark.value?.hide();
      searchValue.value = address;
      selectedAddress.value = {
        name: address,
        coordinates: {
          lng: lnglat[0],
          lat: lnglat[1],
        },
      };
    }
  });
  map.value.on("click", async function (e) {
    placemark.value?.show(e.coordinate);
    const lnglat = toLonLat(e.coordinate);
    const address = await getLngLatAddress({ lng: lnglat[0], lat: lnglat[1] });
    searchValue.value = address;
    selectedAddress.value = {
      name: address,
      coordinates: {
        lng: lnglat[0],
        lat: lnglat[1],
      },
    };
  });
}

const onSearch = _.debounce(async (value) => {
  if (!value) return;
  addressOptions.value = [];
  addressOptions.value = await tdtSearch(value);
  showAddressOptions.value = true;
}, 800);

function selectAddressOption(address: AddressType) {
  searchValue.value = address.name;
  selectedAddress.value = address;
  map.value?.setView(
    new View({
      center: fromLonLat([address.coordinates.lng, address.coordinates.lat]),
      zoom: 14,
      projection: "EPSG:3857",
    })
  );
  placemark.value?.show(
    fromLonLat([address.coordinates.lng, address.coordinates.lat])
  );
  addressOptions.value = [];
  showAddressOptions.value = false;
}

function onSelectAddress() {
  console.log("确定位置", selectedAddress.value);

  address.value = selectedAddress.value;
  router.back();
}

function clearSelect() {
  searchValue.value = "";
  selectedAddress.value = undefined;
  placemark.value?.hide();
  addressOptions.value = [];
}

onActivated(async () => {
  if (!map.value) {
    await mapInit();
  }
  await loadData();
  if (!address.value) {
    const lonlat = await getCurrentLngLat();
    if (lonlat) {
      const add = await getLngLatAddress(lonlat);
      selectAddressOption({
        name: add,
        coordinates: {
          lng: lonlat.lng,
          lat: lonlat.lat,
        },
      });
    }
  } else {
    selectAddressOption(address.value);
  }
});
</script>

<template>
  <div class="relative w-screen h-screen flex flex-col">
    <van-nav-bar
      title="选择位置"
      left-arrow
      @click-left="$router.back()"
    >
      <template #right>
        <van-icon
          v-if="selectedAddress"
          name="success"
          size="18"
          @click="onSelectAddress"
        />
      </template>
    </van-nav-bar>
    <div class="relative">
      <van-search
        v-model="searchValue"
        @update:model-value="onSearch"
        placeholder="请输入搜索关键词"
        shape="round"
        class="h-[50px]"
        :clearable="false"
        @blur="hideAddressOptions"
      >
        <template #right-icon>
          <van-icon
            v-if="searchValue"
            name="cross"
            @click="clearSelect"
          />
        </template>
      </van-search>
      <div
        v-if="showAddressOptions"
        class="absolute top-[50px] left-0 right-0 w-full max-h-[260px] overflow-auto z-1001 thin-scrollbar"
      >
        <van-cell-group class="px-4">
          <van-cell
            v-for="(address, index) in addressOptions"
            :key="index"
            :title="address.name"
            @click="selectAddressOption(address)"
            clickable
          >
          </van-cell>
        </van-cell-group>
      </div>
    </div>

    <div
      id="mapDiv"
      class="w-full h-full"
    ></div>

    <!-- <TdtMap
      @init="mapInit"
      :center="state.center"
      :zoom="state.zoom"
    ></TdtMap> -->
  </div>
</template>

<style scoped lang="less">
/* 自定义标记样式 */
.blue-cross-marker {
  position: relative;
  width: 30px;
  height: 40px;
}
.blue-cross-marker::before {
  content: "";
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 0;
  height: 0;
  border-left: 10px solid transparent;
  border-right: 10px solid transparent;
  border-bottom: 20px solid #4285f4;
}
.blue-cross-marker::after {
  content: "+";
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translate(-50%, -50%);
  color: #4285f4;
  font-size: 16px;
  font-weight: bold;
}
</style>
