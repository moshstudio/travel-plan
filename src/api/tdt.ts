declare namespace T {
  // 定义 Geocoder 类
  class Geocoder {
    getLocation(
      lngLat: LngLat,
      callback: (result: { formatted_address: string }) => void
    ): void;
  }

  // 定义 LngLat 类
  class LngLat {
    constructor(lng: number, lat: number);
  }

  // 定义 InfoWindow 类
  class InfoWindow {
    constructor(content: string);
  }
}

export function getAddressByCoordinate(
  lng: number,
  lat: number,
  callback: (address: string) => void
) {
  // 创建逆地理编码服务实例
  var geocoder = new T.Geocoder();

  // 调用getLocation方法
  geocoder.getLocation(new T.LngLat(lng, lat), function (result) {
    callback(result.formatted_address);
  });
}
