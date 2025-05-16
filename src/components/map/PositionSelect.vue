<script setup>
import _ from "lodash";
import { useStore } from "@/store";
import { ref, reactive } from "vue";
import { TdtMap, TdtMarker } from "vue-tianditu2";
import router from "@/router";

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
function mapInit(map) {
  tdtMap.value = map;
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
  }
  function searchResult(result) {
    if (result.getStatus() == 0) {
      selectedAddress.value = {
        address: result.getAddress(),
        lng: result.location.lon,
        lat: result.location.lat,
      };
      searchValue.value = result.getAddress();
      tdtMap.value.clearOverLays();
      tdtMap.value.addOverLay(
        new T.Marker(new T.LngLat(result.location.lon, result.location.lat))
      );
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
          address: item.address + item.name,
          lng: Number(lng),
          lat: Number(lat),
        });
      }
    });
  }

  const config = {
    pageCapacity: 10, //每页显示的数量
    onSearchComplete: localSearchResult, //接收数据的回调函数
  };
  /**搜索类型,1表示普通搜索;2表示视野内搜索;4表示普通建议词搜索;5表示公交规划建议词搜索;7表示 纯地名搜索(不搜公交线）;10表示拉框搜索 */
  let localsearch = new T.LocalSearch(tdtMap.value, config);
  localsearch.search(searchValue.value, 4);
}, 1000);

function selectLocation(address) {
  searchValue.value = address.address;
  selectedAddress.value = address;
  tdtMap.value.centerAndZoom(
    new T.LngLat(address.lng, address.lat),
    state.zoom
  );
  if (tdtMapMarker.value) {
    tdtMap.value.removeOverLay(tdtMapMarker.value);
  }
  tdtMapMarker.value = new T.Marker(new T.LngLat(address.lng, address.lat));

  tdtMap.value.addOverLay(tdtMapMarker.value);
  addressOptions.value = [];
  showAddressOptions.value = false;
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
        class="absolute top-0 left-0 translate-y-[50px] w-full max-h-[300px] overflow-auto z-401"
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
