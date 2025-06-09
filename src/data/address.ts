export interface AddressType {
  name: string; // 地点名称
  address: string; // 详细地址
  coordinates: {
    lng: number;
    lat: number;
  };
}

export interface GeoAdressType {
  /**"score": 100,
  "level": "门址",
  "lon": "116.290158",
  "lat": "39.894696",
  "keyWord": "北京市海淀区莲花池西路28号" */
  score: number;
  level: string;
  lon: number;
  lat: number;
  keyWord: string;
}
