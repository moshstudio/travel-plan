class LocationControl {
  constructor(options) {
    this.options = Object.assign(
      {
        position: "bottom-right",
        title: "定位当前位置",
        zoom: 16,
        enableHighAccuracy: true,
        markerOptions: {},
      },
      options
    );

    this.loading = false;
    this.error = false;
    this.currentMarker = null;

    this.initControl();
  }

  initControl() {
    this.container = document.createElement("div");
    this.container.className = `location-control location-control-${this.options.position}`;

    this.button = document.createElement("div");
    this.button.className = "location-btn";
    this.button.title = this.options.title;
    this.button.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/>
      </svg>
    `;

    this.container.appendChild(this.button);
    this.container.addEventListener("click", (e) => {
      e.stopPropagation(); // 阻止事件冒泡
      this.handleLocate();
    });

    // 添加到地图
    this.options.map.getContainer().appendChild(this.container);

    // 添加样式
    this.addStyles();
  }

  handleLocate() {
    if (this.loading) return;

    this.setLoading(true);

    if (!navigator.geolocation) {
      this.showError("浏览器不支持地理定位");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      this.onLocationSuccess.bind(this),
      this.onLocationError.bind(this),
      {
        enableHighAccuracy: this.options.enableHighAccuracy,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }

  onLocationSuccess(position) {
    this.setLoading(false);
    const lnglat = new T.LngLat(
      position.coords.longitude,
      position.coords.latitude
    );

    // 清除之前的标记
    this.options.map.clearOverLays();
    // if (this.currentMarker) {
    //   this.options.map.removeOverLay(this.currentMarker);
    // }

    // 创建新标记
    const defaultOptions = {
      icon: new T.Icon.Default(),
      title: "当前位置",
    };
    const options = Object.assign(
      {},
      defaultOptions,
      this.options.markerOptions
    );

    this.currentMarker = new T.Marker(lnglat, options);
    this.options.map.addOverLay(this.currentMarker);
    this.options.map.panTo(lnglat);
    this.options.map.setZoom(this.options.zoom);

    if (this.options.onSuccess) {
      this.options.onSuccess({
        lnglat,
        position,
        marker: this.currentMarker,
      });
    }
  }

  onLocationError(error) {
    this.setLoading(false);
    this.showError(this.getErrorMessage(error));

    if (this.options.onError) {
      this.options.onError({
        error,
        message: this.getErrorMessage(error),
      });
    }
  }

  getErrorMessage(error) {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return "用户拒绝了定位请求";
      case error.POSITION_UNAVAILABLE:
        return "位置信息不可用";
      case error.TIMEOUT:
        return "定位请求超时";
      case error.UNKNOWN_ERROR:
        return "未知错误";
      default:
        return "定位失败";
    }
  }

  setLoading(loading) {
    this.loading = loading;

    if (loading) {
      const loadingEl = document.createElement("div");
      loadingEl.className = "location-loading";
      this.container.appendChild(loadingEl);
      this.loadingEl = loadingEl;
    } else if (this.loadingEl) {
      this.container.removeChild(this.loadingEl);
      this.loadingEl = null;
    }
  }

  showError(message) {
    console.error(message);

    // 显示错误指示器
    const errorEl = document.createElement("div");
    errorEl.className = "location-error";
    errorEl.textContent = "!";
    this.container.appendChild(errorEl);

    // 3秒后移除
    setTimeout(() => {
      if (errorEl.parentNode === this.container) {
        this.container.removeChild(errorEl);
      }
    }, 3000);
  }

  addStyles() {
    const style = document.createElement("style");
    style.textContent = `
      .location-control {
        position: absolute;
        z-index: 1000;
        margin: 10px;
        cursor: pointer;
      }
      
      .location-control-top-left {
        top: 0;
        left: 0;
      }
      
      .location-control-top-right {
        top: 0;
        right: 0;
      }
      
      .location-control-bottom-left {
        bottom: 0;
        left: 0;
      }
      
      .location-control-bottom-right {
        bottom: 0;
        right: 0;
      }
      
      .location-btn {
        width: 32px;
        height: 32px;
        background: white;
        border-radius: 2px;
        box-shadow: 0 1px 5px rgba(0,0,0,0.4);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
      }
      
      .location-btn:hover {
        background: #f5f5f5;
      }
      
      .location-btn svg {
        width: 20px;
        height: 20px;
        fill: #333;
      }
      
      .location-loading {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        border: 2px solid rgba(0, 0, 0, 0.1);
        border-top: 2px solid #3498db;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      
      .location-error {
        position: absolute;
        top: -5px;
        right: -5px;
        width: 16px;
        height: 16px;
        background: #e74c3c;
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        font-weight: bold;
      }
      
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }
}

export default LocationControl;
