export interface AddressType {
  id: number;
  name: string; // 地点名称
  address?: string; // 详细地址
  coordinates: {
    lng: number;
    lat: number;
  };
}
