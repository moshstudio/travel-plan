<script setup lang="ts">
import QRCode from "qrcode";
import { saveImageToPictures } from "tauri-plugin-commands";
import { useStore } from "@/store";
import { storeToRefs } from "pinia";
import { formatDateTime } from "@/utils/datetime";
import { computed, onMounted, ref } from "vue";
import html2canvas from "html2canvas-pro";
import {
  showToast,
  showLoadingToast,
  closeToast,
  showConfirmDialog,
} from "vant";
import ShareMap from "@/components/travelStats/ShareMap.vue";
import { TravelPlanStatus } from "@/data/TravelPlan";
import { useDisplayStore } from "@/store/displayStore";

const store = useStore();
const displayStore = useDisplayStore();
const { currentTravel, travelPlans } = storeToRefs(store);

const aviableTravelPlans = computed(() => {
  return travelPlans.value
    ?.filter(
      (item) =>
        item.status != TravelPlanStatus.cancelled &&
        item.status != TravelPlanStatus.deleted
    )
    .sort((a, b) => a.startDateTime - b.startDateTime);
});

const qrCodeUrl = ref<string>();
const shareMap = ref<InstanceType<typeof ShareMap>>();
const generateQRCode = () => {
  QRCode.toDataURL("https://travel-plan.moshangwangluo.com/", (err, url) => {
    if (err) return;
    qrCodeUrl.value = url;
  });
};

const getDayNumber = (dateTime?: number) => {
  if (!dateTime || !travelPlans.value?.[0]?.startDateTime) return 1;

  const startDate = new Date(travelPlans.value[0].startDateTime);
  const planDate = new Date(dateTime);

  // Reset both dates to midnight for accurate day difference calculation
  startDate.setHours(0, 0, 0, 0);
  planDate.setHours(0, 0, 0, 0);

  const diffTime = planDate.getTime() - startDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  return diffDays + 1; // +1 because first day is day 1
};

const saveAsImage = async () => {
  showLoadingToast({
    message: "生成图片中...",
    forbidClick: true,
  });

  try {
    const element = document.getElementById("share-container");
    if (!element) return;

    await document.fonts.ready;
    // const style = document.createElement("style");
    // document.head.appendChild(style);
    // style.sheet?.insertRule(
    //   "body > div:last-child img { display: inline-block; }"
    // );

    const shareCanvas = await html2canvas(element, {
      scale: 6,
      logging: true,
      useCORS: true,
      allowTaint: true,
      width: element.offsetWidth, // 明确设置宽度
      height: element.offsetHeight, // 明确设置高度
      backgroundColor: "#f7f8fa",
      onclone: (clonedDoc: Document) => {
        // Added type for clonedDoc
      },
    });

    if (displayStore.isWeb) {
      const link = document.createElement("a");
      link.download = `${currentTravel.value?.name || "旅行计划"}.jpeg`;
      link.href = shareCanvas
        .toDataURL("image/jpeg", 1)
        .replace("image/jpeg", "image/octet-stream");
      link.click();
    } else if (displayStore.isAndroid) {
      const content = await new Promise<ArrayBuffer>((resolve, reject) => {
        shareCanvas.toBlob(
          (blob) => {
            blob?.arrayBuffer().then(resolve).catch(reject);
          },
          "image/jpeg",
          100
        );
      });

      const res = await saveImageToPictures(
        Buffer.from(content).toString("base64"),
        `${currentTravel.value?.name || "旅行计划"}.jpeg`
      );
      if (res) {
        showConfirmDialog({
          title: "提示",
          message: "已保存至相册",
          showCancelButton: false,
        });
      }
    } else {
      const link = document.createElement("a");
      link.download = `${currentTravel.value?.name || "旅行计划"}.jpeg`;
      link.href = shareCanvas
        .toDataURL("image/jpeg", 1)
        .replace("image/jpeg", "image/octet-stream");
      link.click();
    }

    closeToast();
  } catch (error) {
    closeToast();
    showToast("生成图片失败");
    console.error(error);
  }
};

onMounted(() => {
  generateQRCode();
});
</script>

<template>
  <div class="share-page">
    <van-nav-bar
      title="分享旅行"
      left-arrow
      @click-left="$router.back()"
    >
    </van-nav-bar>

    <div class="scroll-container thin-scrollbar">
      <div
        id="share-container"
        class="share-container"
      >
        <!-- 旅行卡片 -->
        <div
          class="travel-card"
          v-if="currentTravel"
        >
          <div
            class="app-qrcode"
            v-if="qrCodeUrl"
          >
            <img
              :src="qrCodeUrl"
              alt="旅行助手"
            />
          </div>
          <div class="travel-cover">
            <h1 class="travel-title">{{ currentTravel.name }}</h1>
            <div
              class="travel-dates"
              v-if="currentTravel.startDateTime || currentTravel.endDateTime"
            >
              <span v-if="currentTravel.startDateTime">
                {{ formatDateTime(currentTravel.startDateTime) }}
              </span>
              <span
                v-if="currentTravel.startDateTime && currentTravel.endDateTime"
                >-</span
              >
              <span v-if="currentTravel.endDateTime">
                {{ formatDateTime(currentTravel.endDateTime) }}
              </span>
            </div>
          </div>

          <div class="travel-content">
            <div
              class="travel-description"
              v-if="currentTravel.description"
            >
              <van-icon name="description" />
              <p>{{ currentTravel.description }}</p>
            </div>

            <div class="travel-stats">
              <div class="stat-item">
                <van-icon name="points" />
                <span>{{ aviableTravelPlans?.length || 0 }} 个地点</span>
              </div>
              <div class="stat-item">
                <van-icon name="clock" />
                <span>
                  {{
                    currentTravel.startDateTime && currentTravel.endDateTime
                      ? Math.ceil(
                          (currentTravel.endDateTime -
                            currentTravel.startDateTime) /
                            (1000 * 60 * 60 * 24)
                        ) + 1
                      : 0
                  }}
                  天
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- 路线地图 -->
        <div class="map-section">
          <h2 class="section-title">
            <van-icon name="map-marked" />
            <span>旅行路线</span>
          </h2>
          <div class="map-container">
            <ShareMap
              ref="shareMap"
              :plans="travelPlans"
            ></ShareMap>
          </div>
        </div>

        <!-- 行程列表 -->
        <div
          class="plan-section"
          v-if="aviableTravelPlans?.length"
        >
          <h2 class="section-title">
            <van-icon name="notes" />
            <span>行程安排</span>
          </h2>
          <div class="plan-list">
            <div
              class="plan-item"
              v-for="(plan, index) in aviableTravelPlans"
              :key="plan.travelPlanId"
            >
              <div class="plan-day">
                <span class="day-number"
                  >第{{ getDayNumber(plan.startDateTime) }}天</span
                >
                <span class="day-index">NO.{{ index + 1 }}</span>
              </div>
              <div class="plan-content">
                <div class="plan-header">
                  <p class="plan-title">
                    {{ plan.title || plan.location.name }}
                  </p>
                </div>
                <div class="plan-time">
                  <van-icon name="clock" />
                  <span>{{ formatDateTime(plan.startDateTime) }}</span>
                  <span v-if="plan.endDateTime">
                    - {{ formatDateTime(plan.endDateTime) }}</span
                  >
                </div>
                <div
                  class="plan-location"
                  v-if="plan.location?.address"
                >
                  <van-icon name="location" />
                  <span>{{ plan.location.address }}</span>
                </div>
                <div
                  v-if="plan.tags && plan.tags.length > 0"
                  class="flex flex-wrap gap-1.5"
                >
                  <span
                    v-for="(tag, index) in plan.tags"
                    :key="index"
                    class="tag text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-xl inline-flex items-center"
                  >
                    {{ tag }}
                  </span>
                </div>
                <p
                  class="plan-desc"
                  v-if="plan.description"
                >
                  {{ plan.description }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- 底部信息 -->
        <div class="footer">
          <p>分享自 {{ currentTravel?.name }} 旅行计划</p>
          <p class="share-time">
            {{ formatDateTime(currentTravel?.createdAt || Date.now()) }}
          </p>
        </div>
      </div>
    </div>

    <!-- 分享按钮 -->
    <div class="action-bar">
      <van-button
        round
        type="primary"
        block
        class="share-btn"
        @click="saveAsImage"
      >
        <van-icon
          name="share"
          class="mr-1"
        />
        分享给朋友
      </van-button>
    </div>
  </div>
</template>

<style scoped lang="less">
.share-page {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f7f8fa;
  position: relative;
}

.save-btn {
  background: linear-gradient(to right, #ff6034, #ee0a24);
  color: white;
  border: none;
  height: 28px;
  font-size: 12px;
}

.scroll-container {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 80px; /* 为底部按钮留出足够空间 */
}

.share-container {
  padding: 12px;
  min-height: calc(100% - 80px);
}

.travel-card {
  position: relative;
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 16px;

  .app-qrcode {
    position: absolute;
    top: 12px;
    right: 12px;
    width: 60px;
    height: 60px;
    z-index: 1;
    opacity: 0.8;
  }
  .app-qrcode::after {
    content: "旅行助手";
    position: absolute;
    left: 50%;
    transform: translateX(-50%); /* 水平居中 */
    top: 100%; /* 位于父元素底部 */
    margin-top: 2px; /* 与父元素的间距 */
    white-space: nowrap; /* 防止文字换行 */
    font-size: 12px;
    color: #fff;
  }

  .travel-cover {
    background: linear-gradient(135deg, #6e8efb, #a777e3);
    color: white;
    padding: 20px 16px;
    text-align: center;

    .travel-title {
      font-size: 20px;
      font-weight: bold;
      margin: 0 0 8px;
    }

    .travel-dates {
      font-size: 14px;
      opacity: 0.9;
    }
  }

  .travel-content {
    padding: 16px;
    padding-bottom: 0;

    .travel-description {
      display: flex;
      color: #666;
      font-size: 14px;
      margin-bottom: 12px;

      .van-icon {
        margin-right: 8px;
        color: #a777e3;
        flex-shrink: 0;
      }
    }

    .travel-stats {
      display: flex;
      justify-content: space-around;
      padding: 10px 0;
      border-top: 1px dashed #eee;

      .stat-item {
        display: flex;
        align-items: center;
        font-size: 13px;
        color: #666;

        .van-icon {
          margin-right: 4px;
          color: #6e8efb;
        }
      }
    }
  }
}

.section-title {
  font-size: 16px;
  color: #333;

  margin-bottom: 12px;
  display: flex;
  align-items: center;

  .van-icon {
    margin-right: 6px;
    color: #6e8efb;
  }
}

.map-section {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 16px;

  .map-container {
    border-radius: 8px;
    overflow: hidden;
    width: full;
    height: 400px;

    .fixed-map {
      width: 100%;
      height: 100%;
    }
  }
}

.plan-section {
  background: white;
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);

  .plan-list {
    .plan-item {
      display: flex;
      padding: 12px 0;
      border-bottom: 1px solid #f5f5f5;

      &:last-child {
        border-bottom: none;
      }

      .plan-day {
        width: 70px;
        display: flex;
        flex-direction: column;
        align-items: center;
        margin-right: 8px;
      }
      .day-number {
        font-size: 14px;
        color: #6e8efb;
        font-weight: bold;
        white-space: nowrap;
      }
      .day-index {
        font-size: 12px;
        color: #999;
        background: #f5f5f5;
        border-radius: 10px;
        padding: 2px 6px;
        margin-top: 4px;
      }

      .plan-content {
        flex: 1;

        .plan-header {
          display: flex;
          align-items: center;
          margin-bottom: 6px;

          .plan-title {
            font-size: 15px;
            font-weight: bold;
            margin-right: 8px;
          }
        }

        .plan-time,
        .plan-location {
          display: flex;
          align-items: center;
          font-size: 12px;
          color: #666;
          margin-bottom: 4px;

          .van-icon {
            margin-right: 4px;
          }
        }

        .plan-desc {
          font-size: 13px;
          color: #666;
          margin-top: 8px;
        }
      }
    }
  }
}

.footer {
  text-align: center;
  margin: 24px 0;
  font-size: 12px;
  color: #999;

  .share-time {
    margin-top: 4px;
  }
}

.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px;
  background: white;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.1);

  .share-btn {
    height: 44px;
    background: linear-gradient(to right, #6e8efb, #a777e3);
    border: none;
  }
}
</style>
