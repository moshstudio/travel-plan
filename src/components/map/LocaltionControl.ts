import { Control } from "ol/control";
import { fromLonLat, toLonLat } from "ol/proj";
import { MapEvent } from "ol";
import BaseEvent from "ol/events/Event";
import Map from "ol/Map";
import { EventsKey } from "ol/events";
import { unByKey } from "ol/Observable";
import Feature from "ol/Feature";
import Point from "ol/geom/Point";
import { Style, Icon, Circle, Fill, Stroke } from "ol/style";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";

// 定义定位成功事件接口
export interface PositionEvent extends BaseEvent {
  type: "position";
  coordinate: number[];
  lnglat: [number, number];
}

// 定义定位错误事件接口
export interface GeolocationErrorEvent extends BaseEvent {
  type: "error";
  error: GeolocationPositionError | Error;
}

// 控件选项接口
export interface MyLocationControlOptions {
  className?: string;
  tipLabel?: string;
  autoActivate?: boolean;
  target?: HTMLElement | string;
  markerStyle?: Style;
}

export class MyLocationControl extends Control {
  private button_: HTMLButtonElement;
  private listenerKeys_: EventsKey[] = [];
  private geolocationWatchId_: number | null = null;
  private markerLayer_: VectorLayer<VectorSource> | null = null;
  private markerFeature_: Feature<Point> | null = null;

  constructor(options?: MyLocationControlOptions) {
    options = options || {};

    // 创建按钮元素
    const button = document.createElement("button");
    button.type = "button";
    button.title = options.tipLabel || "定位到当前位置";
    button.innerHTML = `<svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
  <circle cx="12" cy="12" r="10"></circle>
  <circle cx="12" cy="12" r="4"></circle>
</svg>`;
    button.style =
      "display: flex; align-items: center; justify-content: center; ";

    // 创建容器元素
    const element = document.createElement("div");
    element.className = options.className || "ol-unselectable ol-control";
    element.style = "right: 10px; bottom: 10px;";
    element.appendChild(button);

    super({
      element: element,
      target: options.target,
    });

    this.button_ = button;

    // 创建标记图层
    this.markerLayer_ = new VectorLayer({
      source: new VectorSource(),
      style: options.markerStyle || this.getDefaultMarkerStyle_(),
      zIndex: 1000,
    });

    // 绑定点击事件
    this.button_.addEventListener("click", this.handleClick_.bind(this), false);

    // 如果设置自动激活，则立即尝试定位
    if (options.autoActivate) {
      this.activate_();
    }
  }

  // 获取默认标记样式
  private getDefaultMarkerStyle_(): Style {
    return new Style({
      image: new Circle({
        radius: 6,
        fill: new Fill({
          color: "#4285F4",
        }),
        stroke: new Stroke({
          color: "#FFB6C140",
          width: 36,
        }),
      }),
    });
  }

  // 处理按钮点击
  private handleClick_() {
    this.activate_();
  }

  // 激活定位功能
  private activate_() {
    const map = this.getMap();
    if (!map) {
      console.warn("Location control must be added to a map before activation");
      return;
    }

    // 确保标记图层已添加到地图
    if (this.markerLayer_ && !map.getAllLayers().includes(this.markerLayer_)) {
      map.addLayer(this.markerLayer_);
    }

    this.button_.disabled = true;
    this.button_.classList.add("ol-locating");

    // 清除之前的监听
    this.deactivate_();

    // 使用浏览器 Geolocation API
    if ("geolocation" in navigator) {
      this.geolocationWatchId_ = navigator.geolocation.watchPosition(
        this.handleGeolocationSuccess_.bind(this),
        this.handleGeolocationError_.bind(this),
        {
          enableHighAccuracy: true,
          maximumAge: 30000,
          timeout: 10000,
        }
      );
    } else {
      this.handleGeolocationError_({
        code: 2,
        message: "Geolocation not supported by this browser",
      } as GeolocationPositionError);
    }
  }

  // 取消激活定位功能
  private deactivate_() {
    if (this.geolocationWatchId_ !== null) {
      navigator.geolocation.clearWatch(this.geolocationWatchId_);
      this.geolocationWatchId_ = null;
    }
    this.button_.disabled = false;
    this.button_.classList.remove("ol-locating");
  }

  // 处理定位成功
  private handleGeolocationSuccess_(position: GeolocationPosition) {
    const map = this.getMap();
    if (!map || !this.markerLayer_) return;

    const lnglat: [number, number] = [
      position.coords.longitude,
      position.coords.latitude,
    ];
    const coordinate = fromLonLat(lnglat);

    // 更新或创建标记
    if (!this.markerFeature_) {
      this.markerFeature_ = new Feature({
        geometry: new Point(coordinate),
      });
      this.markerLayer_.getSource()?.addFeature(this.markerFeature_);
    } else {
      (this.markerFeature_.getGeometry() as Point).setCoordinates(coordinate);
    }

    // 触发自定义事件
    const event: PositionEvent = new BaseEvent("position") as PositionEvent;
    event.type = "position";
    event.coordinate = coordinate;
    event.lnglat = lnglat;
    this.dispatchEvent(event);

    // 移动视图到当前位置
    map.getView().animate({
      center: coordinate,
      zoom: Math.max(map.getView().getZoom() || 14, 14),
    });

    this.deactivate_();
  }

  // 处理定位错误
  private handleGeolocationError_(error: GeolocationPositionError) {
    console.error("Geolocation error:", error.message);

    // 触发错误事件
    const event: GeolocationErrorEvent = new BaseEvent(
      "error"
    ) as GeolocationErrorEvent;
    event.type = "error";
    event.error = error;
    this.dispatchEvent(event);

    this.deactivate_();
  }

  // 重写 setMap 方法
  setMap(map: Map | null) {
    // 清除之前的监听
    for (let i = 0, ii = this.listenerKeys_.length; i < ii; ++i) {
      unByKey(this.listenerKeys_[i]);
    }
    this.listenerKeys_.length = 0;

    // 调用父类方法
    super.setMap(map);

    if (map && this.markerLayer_) {
      // 添加标记图层
      map.addLayer(this.markerLayer_);

      // 添加一些额外的监听
      this.listenerKeys_.push(
        map.on("postrender", this.handleMapPostRender_.bind(this))
      );
    }
  }

  // 地图渲染后处理
  private handleMapPostRender_(event: MapEvent) {
    // 可以在这里添加一些渲染后的逻辑
  }

  // 销毁控件
  disposeInternal() {
    this.deactivate_();
    this.button_.removeEventListener(
      "click",
      this.handleClick_.bind(this),
      false
    );

    // 清除标记图层
    const map = this.getMap();
    if (map && this.markerLayer_) {
      map.removeLayer(this.markerLayer_);
      this.markerLayer_ = null;
    }

    super.disposeInternal();
  }
}
