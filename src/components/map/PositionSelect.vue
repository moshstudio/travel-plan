<script setup>
import _ from "lodash";
import { useStore } from "@/store";
import { ref, reactive, onActivated, onMounted } from "vue";
import { TdtMap, TdtMarker } from "vue-tianditu2";
import router from "@/router";
import LocationControl from "@/components/map/geolocationControl";
import { showConfirmDialog, showDialog, showToast } from "vant";

const store = useStore();

const searchValue = ref("");
const tdtMap = ref();
const tdtMapMarker = ref();
const state = reactive({
  center: [116.3976, 39.9035],
  zoom: 16,
});

const selectedAddress = ref();
const addressOptions = ref([]);
const showAddressOptions = ref(false);

const hideAddressOptions = () => {
  setTimeout(() => {
    showAddressOptions.value = false;
  }, 200);
};
async function mapInit(map) {
  tdtMap.value = map;
  map.addControl(new T.Control.Zoom());
  // map.addControl(new T.Control.Scale());
  new LocationControl({
    map: map,
    position: "bottom-right",
    onSuccess: (event) => {
      let geocode = new T.Geocoder();
      geocode.getLocation(event.lnglat, (result) => {
        console.log(result);

        if (result.getStatus() == 0) {
          selectedAddress.value = {
            address: result.getAddress(),
            lng: result.location.lon,
            lat: result.location.lat,
          };
          searchValue.value = result.getAddress();
          addNewtdtMarker(result.location.lon, result.location.lat);
          tdtMap.value.centerAndZoom(
            new T.LngLat(result.location.lon, result.location.lat),
            16
          );
        } else {
          map.clearOverLays();
        }
      });
    },
    onError: (error) => {
      console.error("定位失败:", error.message);
    },
  });

  if (store.positionSelectAddress) {
    selectedAddress.value = store.positionSelectAddress;
    searchValue.value = store.positionSelectAddress.address;
    map.centerAndZoom(
      new T.LngLat(
        store.positionSelectAddress.lng,
        store.positionSelectAddress.lat
      ),
      16
    );
    addNewtdtMarker(
      store.positionSelectAddress.lng,
      store.positionSelectAddress.lat
    );
  }
  function searchResult(result) {
    if (result.getStatus() == 0) {
      selectedAddress.value = {
        address: result.getAddress(),
        lng: result.location.lon,
        lat: result.location.lat,
      };
      searchValue.value = result.getAddress();
      addNewtdtMarker(result.location.lon, result.location.lat);
    } else {
      map.clearOverLays();
    }
  }
  let geocode = new T.Geocoder();
  map.addEventListener("click", function (e) {
    geocode.getLocation(e.lnglat, searchResult);
  });
}

const onSearch = _.debounce((value) => {
  if (!value) return;
  addressOptions.value = [];
  function localSearchResult(result) {
    result.suggests.forEach((item) => {
      showAddressOptions.value = true;
      const [lng, lat] = item.lonlat.split(",");
      if (item.address === item.name) {
        addressOptions.value.push({
          address: item.name,
          lng: Number(lng),
          lat: Number(lat),
        });
      } else {
        addressOptions.value.push({
          address: item.address + " " + item.name,
          lng: Number(lng),
          lat: Number(lat),
        });
      }
    });
  }

  const config = {
    pageCapacity: 15, //每页显示的数量
    onSearchComplete: localSearchResult, //接收数据的回调函数
  };
  /**搜索类型,1表示普通搜索;2表示视野内搜索;4表示普通建议词搜索;5表示公交规划建议词搜索;7表示 纯地名搜索(不搜公交线）;10表示拉框搜索 */
  let localsearch = new T.LocalSearch(tdtMap.value, config);
  localsearch.search(searchValue.value, 4);
}, 800);

function selectLocation(address) {
  searchValue.value = address.address;
  selectedAddress.value = address;
  tdtMap.value.centerAndZoom(
    new T.LngLat(address.lng, address.lat),
    state.zoom
  );
  addNewtdtMarker(address.lng, address.lat);
  addressOptions.value = [];
  showAddressOptions.value = false;
}

function addNewtdtMarker(lng, lat) {
  if (tdtMapMarker.value) {
    tdtMap.value.removeOverLay(tdtMapMarker.value);
  }
  tdtMap.value.clearOverLays();
  tdtMapMarker.value = new T.Marker(new T.LngLat(lng, lat));
  tdtMap.value.addOverLay(tdtMapMarker.value);
}

function onSelectAddress() {
  store.positionSelectAddress = selectedAddress.value;
  router.back();
}

function clearSelect() {
  searchValue.value = "";
  selectedAddress.value = null;
  if (TdtMarker.value) {
    tdtMapMarker.value.removeOverLay(tdtMapMarker.value);
  }
  addressOptions.value = [];
}

onActivated(() => {
  if (tdtMap.value && store.positionSelectAddress) {
    selectedAddress.value = store.positionSelectAddress;
    searchValue.value = store.positionSelectAddress.address;
    tdtMap.value.centerAndZoom(
      new T.LngLat(
        store.positionSelectAddress.lng,
        store.positionSelectAddress.lat
      ),
      16
    );
    addNewtdtMarker(
      store.positionSelectAddress.lng,
      store.positionSelectAddress.lat
    );
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
            :title="address.address"
            @click="selectLocation(address)"
            clickable
          >
          </van-cell>
        </van-cell-group>
      </div>
    </div>

    <TdtMap
      @init="mapInit"
      :center="state.center"
      :zoom="state.zoom"
    ></TdtMap>
  </div>
</template>

<style scoped lang="less"></style>
