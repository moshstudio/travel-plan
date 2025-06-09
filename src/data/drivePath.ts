import { Coordinate } from "ol/coordinate";

export type TDTDriveSubPath = {
  guide?: string | null;
  streetName?: string | null;
  lat: number;
  lon: number;
  distance?: number; // 公里
  segment?: string | null;
};

export type TDTDrivePath = {
  totalDistance?: number | null; // 公里
  totalDuration?: number | null; // 秒
  items: TDTDriveSubPath[];
  routelatlon: Coordinate[];
  center?: Coordinate;
};
