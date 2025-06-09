<script setup lang="ts">
import { Feature, Map, Overlay, View } from "ol";
import { PayMethod, TravelExpenseType } from "@/data/expense";
import { useStore } from "@/store";
import { storeToRefs } from "pinia";
import { ref, reactive, onActivated, toRaw, onMounted, nextTick } from "vue";
import { useRoute } from "vue-router";
import { Icon } from "@iconify/vue";
import LocationButton from "@/components/map/LocationButton.vue";
import CompassButton from "@/components/map/CompassButton.vue";
import ZoomButton from "@/components/map/ZoomButton.vue";
import Placemark from "@/components/map/Placemark.vue";
import OlPopup from "@/components/map/OlPopup.vue";
import TimeSelector from "@/components/plan/TimeSelector.vue";
import DescribeInput from "@/components/plan/DescribeInput.vue";
import { AddressType } from "@/data/address";
import TileLayer from "ol/layer/Tile";
import { XYZ } from "ol/source";
import {
  getLngLatAddress,
  tdtSearch,
  tdtXYZPoxyCVAUrl,
  tdtXYZPoxyVECUrl,
} from "@/api/tdt";
import { fromLonLat, toLonLat } from "ol/proj";
import { defaults, Zoom } from "ol/control";
import { Coordinate } from "ol/coordinate";
import { mapSetViewOffset } from "@/utils/map/mapUtil";
import _ from "lodash";
import { showConfirmDialog, showFailToast, showSuccessToast } from "vant";
import { routerBack, sleep } from "@/utils";
import VectorLayer from "ol/layer/Vector";
import { AttachmentType } from "@/data/attachments";
import VectorSource from "ol/source/Vector";
import router from "@/router";
import { Point } from "ol/geom";
import { Fill, Stroke, Style } from "ol/style";
import CircleStyle from "ol/style/Circle";
import pWaitFor from "p-wait-for";
import { getExpensePayMethodColor } from "@/utils/planUtils";

const route = useRoute();
const store = useStore();
const { currentTravel, travelExpenses } = storeToRefs(store);

const expenseId = ref<string | undefined>();
const getExpenseById = (id?: string) => {
  if (!id) return;
  return travelExpenses.value?.find((expense) => expense.expenseId === id);
};
const currentExpense = ref<TravelExpenseType>();

const mapContainer = ref<HTMLElement>();
const map = ref<Map>();
const pointLayer = ref<VectorLayer>();

const searchValue = ref("");
const selectedAddress = ref<AddressType>();
const addressOptions = ref<AddressType[]>([]);
const showAddressOptions = ref(false);
const showSelectedAddressInfo = ref(false);
const showPaymentPicker = ref(false);
const paymentMethods: { text: string; value: PayMethod }[] = [
  { text: "支付宝", value: PayMethod.alipay },
  { text: "微信支付", value: PayMethod.wechat_pay },
  { text: "现金", value: PayMethod.cash },
  { text: "信用卡", value: PayMethod.credit_card },
  { text: "银行转账", value: PayMethod.bank_transfer },
  { text: "其他", value: PayMethod.other },
];

const selectedExpenseInfos = reactive({
  amount: 0,
  currency: "CNY" as "CNY" | "USD" | "EUR",
  tags: [] as string[],
  description: "",
  dateTime: new Date(),
  paymentMethod: "alipay" as PayMethod,
  location: undefined as AddressType | undefined,
  sharedWith: [] as string[],
  attachments: [] as AttachmentType[],
  isReimbursed: false,
});

const initParams = (expense: TravelExpenseType) => {
  selectedExpenseInfos.amount = expense.amount;
  selectedExpenseInfos.currency = expense.currency;
  selectedExpenseInfos.tags = expense.tags || [];
  selectedExpenseInfos.description = expense.description || "";
  selectedExpenseInfos.dateTime = expense.dateTime;
  selectedExpenseInfos.paymentMethod = expense.paymentMethod;
  selectedExpenseInfos.location = expense.location;

  selectedAddress.value = expense.location;
  showSelectedAddressInfo.value = true;
  expenseId.value = expense.expenseId;
  currentExpense.value = expense;
  if (expense.location) {
    mapSetViewOffset(
      map.value,
      expense.location.coordinates.lng,
      expense.location.coordinates.lat,
      map.value?.getView().getZoom() || 14,
      160
    );
  }
};

async function mapInit() {
  pointLayer.value = new VectorLayer({
    source: new VectorSource(),
  });
  map.value = new Map({
    target: "selectExpensePositionMap",
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

  map.value.on("click", async function (e) {
    showPosition(e.coordinate);
  });
}

const showPosition = async (
  coordinate: Coordinate,
  expense?: TravelExpenseType
) => {
  showAddressOptions.value = false;
  const lnglat = toLonLat(coordinate);
  if (expense) {
    expenseId.value = expense.expenseId;
    currentExpense.value = getExpenseById(expense.expenseId);
  } else {
    const addedPositions = travelExpenses.value?.filter(
      (item) =>
        item.location?.coordinates.lng === lnglat[0] &&
        item.location?.coordinates.lat === lnglat[1]
    );
    expenseId.value = expenseId.value
      ? addedPositions?.find((item) => item.expenseId === expenseId.value)
          ?.expenseId
      : addedPositions?.[0]?.expenseId;
    currentExpense.value = getExpenseById(expenseId.value);
  }
  if (currentExpense.value) {
    // 编辑花费
    initParams(currentExpense.value);
  } else {
    const address = await getLngLatAddress({ lng: lnglat[0], lat: lnglat[1] });
    if (address) {
      searchValue.value = address.address;
      selectedAddress.value = address;
      showSelectedAddressInfo.value = true;
      mapSetViewOffset(
        map.value,
        lnglat[0],
        lnglat[1],
        map.value?.getView().getZoom() || 14,
        160
      );
    }
  }
};

const onSearch = async (value: string) => {
  if (!value) return;
  addressOptions.value = [];
  addressOptions.value = await tdtSearch(value);
  showAddressOptions.value = true;
  searchValue.value = value;
};
const debounceOnSearch = _.debounce(onSearch, 500);

async function selectAddressOption(address: AddressType) {
  searchValue.value = address.name;
  selectedAddress.value = address;
  mapSetViewOffset(
    map.value,
    address.coordinates.lng,
    address.coordinates.lat,
    map.value?.getView().getZoom() || 14,
    160
  );

  addressOptions.value = [];
  showAddressOptions.value = false;
}
async function clearSelected() {
  searchValue.value = "";
  showAddressOptions.value = false;
}

async function onCreateOrUpdateExpense() {
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
    showFailToast("请选择位置");
    return;
  }
  if (!currentExpense.value) {
    // 创建
    const expenseData: Omit<TravelExpenseType, "id" | "expenseId"> = {
      travelId: currentTravel.value.travelId,
      amount: selectedExpenseInfos.amount,
      currency: selectedExpenseInfos.currency,
      tags: toRaw(selectedExpenseInfos.tags),
      description: selectedExpenseInfos.description,
      dateTime: selectedExpenseInfos.dateTime,
      paymentMethod: selectedExpenseInfos.paymentMethod,
      location: toRaw(selectedAddress.value),
      sharedWith: toRaw(selectedExpenseInfos.sharedWith),
      attachments: toRaw(selectedExpenseInfos.attachments),
      isReimbursed: selectedExpenseInfos.isReimbursed,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const addedExpense = await store.addTravelExpense(expenseData);
    if (addedExpense) {
      showSuccessToast("花费项添加成功");
      expenseId.value = addedExpense.expenseId;
      currentExpense.value = addedExpense;
      showSelectedAddressInfo.value = false;
      await sleep(1000);
      loadExpansePositions();
    }
  } else {
    // 编辑
    const expenseData: TravelExpenseType = {
      id: currentExpense.value.id,
      travelId: currentExpense.value.travelId,
      expenseId: currentExpense.value.expenseId,
      amount: Number(selectedExpenseInfos.amount),
      currency: selectedExpenseInfos.currency,
      tags: toRaw(selectedExpenseInfos.tags),
      description: selectedExpenseInfos.description,
      dateTime: selectedExpenseInfos.dateTime,
      paymentMethod: selectedExpenseInfos.paymentMethod as any,
      location: toRaw(selectedAddress.value),
      sharedWith: toRaw(selectedExpenseInfos.sharedWith),
      attachments: toRaw(selectedExpenseInfos.attachments),
      isReimbursed: selectedExpenseInfos.isReimbursed,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    await store.updateTravelExpense(expenseData);
    showSuccessToast("花费项更新成功");
    showSelectedAddressInfo.value = false;
    await sleep(1000);
    loadExpansePositions();
  }
}

async function onDeleteExpense() {
  if (!currentExpense.value) return;
  showConfirmDialog({
    title: "提示",
    message: `确定删除该花费项吗？\n${
      currentExpense.value.location?.name ||
      currentExpense.value.location?.address
    }`,
    confirmButtonText: "删除",
    cancelButtonText: "取消",
  }).then(async () => {
    if (!currentExpense.value) return;
    await store.deleteTravelExpense(currentExpense.value);
    showSuccessToast("花费删除成功");
    showSelectedAddressInfo.value = false;
    await sleep(1000);
    loadExpansePositions();
  });
}

const loadExpansePositions = async () => {
  if (!map.value) return;
  if (pointLayer.value) {
    pointLayer.value.getSource()?.clear();
  }
  const features: Feature<Point>[] = [];

  travelExpenses.value?.forEach((expense) => {
    const point = new Point(
      fromLonLat([
        expense.location.coordinates.lng,
        expense.location.coordinates.lat,
      ])
    );
    const feature = new Feature({
      geometry: point,
    });
    feature.set("expense", expense);
    function createPointStyle(expense: TravelExpenseType) {
      return new Style({
        image: new CircleStyle({
          radius: 5,
          fill: new Fill({
            color: "red",
          }),
          stroke: new Stroke({
            color: "white",
            width: 2,
          }),
        }),
      });
    }
    feature.setStyle(createPointStyle(expense));
    features.push(feature);
  });
  pointLayer.value?.getSource()?.addFeatures(features);
  // if (currentExpense.value) {
  //   selectedAddress.value = currentExpense.value.location;
  //   searchValue.value = currentExpense.value.location.name;
  //   mapSetViewOffset(
  //     map.value,
  //     currentExpense.value.location.coordinates.lng,
  //     currentExpense.value.location.coordinates.lat,
  //     map.value?.getView().getZoom() || 14,
  //     0
  //   );
  // }
};

const setOverlay = async (overlay: Overlay, expense: TravelExpenseType) => {
  try {
    await pWaitFor(() => map.value !== undefined, {
      interval: 100,
      timeout: 3000,
    });
    await sleep(200);
    map.value?.addOverlay(overlay);
    overlay.setPosition(
      fromLonLat([
        expense.location.coordinates.lng,
        expense.location.coordinates.lat,
      ])
    );
  } catch (error) {
    console.warn(error);
  }
};

// 计算同位置Popup数量
const getPopupCount = (
  position: { lng: number; lat: number },
  expenseId: string
) => {
  const list = travelExpenses.value?.filter(
    (e) =>
      e.location.coordinates.lng === position.lng &&
      e.location.coordinates.lat === position.lat
  );
  if (!list) return 0;
  return list.findIndex((e) => e.expenseId === expenseId);
};

const handlePopupClick = (expense: TravelExpenseType) => {
  expenseId.value = expense.expenseId;
  showPosition(
    fromLonLat([
      expense.location.coordinates.lng,
      expense.location.coordinates.lat,
    ]),
    expense
  );
};

onMounted(async () => {
  await nextTick();
  mapContainer.value!.addEventListener("get-popup-count", (e: any) => {
    e.detail.count = getPopupCount(e.detail.position, e.detail.id);
  });
});

onActivated(async () => {
  if (!map.value) {
    await mapInit();
  }
  await sleep(200);
  loadExpansePositions();
  const _expenseId = route.query.expenseId;
  if (_expenseId !== expenseId.value) {
    // 新的id重新加载
    const expense = getExpenseById(_expenseId as string);
    if (expense) {
      initParams(expense);
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
      id="selectExpensePositionMap"
      class="w-full h-full"
    ></div>
    <OlPopup
      v-for="(expense, index) in travelExpenses"
      :key="expense.expenseId"
      :position="expense.location.coordinates"
      :visible="true"
      :id="expense.expenseId"
      :title="expense.location.name"
      :description="
        '￥' +
        expense.amount +
        (expense.description ? ' / ' + expense.description : '')
      "
      :repeat-offset="40"
      icon="iconamoon:location-duotone"
      icon-color="red"
      :closable="false"
      :clickable="true"
      :shadow-color="getExpensePayMethodColor(expense.paymentMethod)"
      :border-color="getExpensePayMethodColor(expense.paymentMethod)"
      @overlay-created="(o) => setOverlay(o, expense)"
      @click="() => handlePopupClick(expense)"
    ></OlPopup>
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

    <div class="absolute left-4 top-4 right-4 flex gap-0 rounded-2xl shadow">
      <van-search
        v-model:model-value="searchValue"
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
      class="absolute top-[50px] left-4 right-4 max-h-[260px] overflow-auto z-1001 thin-scrollbar bf-[var(--van-background)]"
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
    <van-popup
      v-if="selectedAddress"
      v-model:show="showSelectedAddressInfo"
      position="bottom"
      teleport="body"
      :overlay="false"
      closeable
      round
    >
      <div class="flex flex-col gap-1 p-6 pb-8 shadow">
        <h2 class="mr-6">{{ selectedAddress.name }}</h2>
        <p class="text-[var(--van-text-color-2)] text-sm">
          {{ selectedAddress.address }}
        </p>
        <p class="text-[var(--van-text-color-2)] text-xs">
          东经 {{ selectedAddress.coordinates.lng.toFixed(3) }} 北纬
          {{ selectedAddress.coordinates.lat.toFixed(3) }}
        </p>
        <!-- <div
          v-if="currentExpense"
          class="inline-block"
        >
          {{ currentExpense.description }}
        </div> -->
        <van-divider></van-divider>
        <div class="flex items-start justify-start gap-4">
          <div class="text-nowrap text-sm mt-[2px]">金额</div>
          <div class="flex-grow flex flex-col min-w-0">
            <van-field
              v-model="selectedExpenseInfos.amount"
              placeholder="0.00"
              class="!p-0 w-full ml-2"
            >
              <template #right-icon>
                <Icon
                  icon="mingcute:currency-cny-2-fill"
                  width="18"
                  height="18"
                />
              </template>
            </van-field>
            <div
              class="quick-button p-1 w-full flex flex-nowrap gap-2 overflow-x-auto overflow-y-hidden thin-scrollbar"
            >
              <van-button
                v-for="amount in [1, 2, 5, 8, 10, 20, 50, 100]"
                :key="amount"
                size="small"
                plain
                type="primary"
                @click="selectedExpenseInfos.amount = amount"
              >
                {{ amount }}
              </van-button>
            </div>
          </div>
        </div>
        <van-divider></van-divider>
        <div
          class="flex items-center justify-start gap-2 py-1 w-full van-haptics-feedback"
          @click="showPaymentPicker = true"
        >
          <div class="text-nowrap text-sm">支付方式</div>
          <div
            class="flex-grow text-end text-sm"
            :style="{
              color: getExpensePayMethodColor(
                paymentMethods.find(
                  (p) => p.value === selectedExpenseInfos.paymentMethod
                )?.value
              ),
            }"
          >
            {{
              paymentMethods.find(
                (p) => p.value === selectedExpenseInfos.paymentMethod
              )?.text
            }}
          </div>
          <van-icon
            name="arrow"
            color="gray"
          ></van-icon>
        </div>
        <van-divider></van-divider>
        <TimeSelector
          v-model:model-value="selectedExpenseInfos.dateTime"
          @update:model-value="
            (v) => {
              selectedExpenseInfos.dateTime = v;
            }
          "
          label="时间"
          :label-style="{ color: 'unset', fontSize: '14px' }"
        ></TimeSelector>
        <van-divider></van-divider>
        <div class="flex items-start justify-start gap-2 w-full">
          <div class="text-nowrap text-sm">分类</div>
          <div class="text-sm">
            <van-checkbox-group
              v-model="selectedExpenseInfos.tags"
              direction="horizontal"
            >
              <van-checkbox
                v-for="tag in [
                  '餐饮',
                  '交通',
                  '住宿',
                  '门票',
                  '购物',
                  '娱乐',
                  '其他',
                ]"
                :key="tag"
                :name="tag"
                shape="square"
                icon-size="16px"
                class="mr-2 mb-2"
              >
                {{ tag }}
              </van-checkbox>
            </van-checkbox-group>
          </div>
        </div>
        <van-divider></van-divider>
        <DescribeInput
          :describe="selectedExpenseInfos.description || ''"
          @change="(v) => (selectedExpenseInfos.description = v)"
          label="备注"
          :label-style="{ color: 'unset', fontSize: '14px' }"
        ></DescribeInput>
        <van-divider></van-divider>
        <div class="flex items-center justify-between">
          <van-icon
            v-if="currentExpense"
            name="delete"
            color="red"
            class="van-haptics-feedback"
            @click="onDeleteExpense"
          ></van-icon>
          <div class="flex-grow"></div>
          <van-button
            size="small"
            :type="currentExpense ? 'success' : 'primary'"
            @click="onCreateOrUpdateExpense"
          >
            {{ currentExpense ? "更新花费" : "创建花费" }}
          </van-button>
        </div>
      </div>
    </van-popup>
    <van-dialog
      teleport="body"
      v-model:show="showPaymentPicker"
      close-on-click-overlay
      :show-confirm-button="false"
    >
      <van-list>
        <van-cell
          v-for="item in paymentMethods"
          :key="item.value"
          :style="{
            color:
              item.value === selectedExpenseInfos.paymentMethod
                ? getExpensePayMethodColor(item.value)
                : '',
          }"
          @click="
            () => {
              selectedExpenseInfos.paymentMethod = item.value as any;
              showPaymentPicker = false;
            }
          "
          clickable
        >
          <template #title>
            <p class="text-center">{{ item.text }}</p>
          </template>
        </van-cell>
      </van-list>
    </van-dialog>
  </div>
</template>

<style scoped lang="less">
:deep(#selectExpensePositionMap .ol-zoom) {
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
:deep(.quick-button .van-button--small) {
  padding: 0 6px;
  height: 28px;
}
</style>
