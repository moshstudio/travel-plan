import { Map } from "ol";
import { Coordinate } from "ol/coordinate";
import { fromLonLat } from "ol/proj";
import { simplifyLineString as _simplifyLineString } from "ol/geom/flat/simplify";

export function mapSetViewOffset(
  map: Map | undefined,
  lng: number,
  lat: number,
  zoom: number,
  pixelOffset: number = 130
) {
  if (!map) return;
  const view = map.getView();
  const currentResolution = view.getResolution();

  if (!currentResolution) return;

  // 动态计算偏移量 - zoom越大偏移越小
  const dynamicOffset = pixelOffset / Math.pow(1.5, Math.max(0, zoom - 14));

  // 计算中心点坐标
  const center = fromLonLat([lng, lat]);

  // 计算偏移后的坐标（向上移动）
  const offsetY = dynamicOffset * currentResolution;
  const newCenter = [center[0], center[1] - offsetY];

  // 应用动画
  view.animate({
    center: newCenter,
    zoom: zoom,
    duration: 1000,
    //easing: (t) => t * (2 - t), // 平滑缓动效果
  });
}

export function simplifyLineString(points: Coordinate[]) {
  const flatCoordinates = points.flat();
  const simplifiedFlatCoordinates = _simplifyLineString(
    flatCoordinates, // 展平的坐标数组
    0, // 起始偏移量
    flatCoordinates.length, // 结束偏移量
    2, // 坐标维度（2表示二维坐标）
    0, // 简化容差（tolerance）
    false // 是否高质量简化
  );
  // 将简化后的展平坐标转换回二维数组
  let simplifiedCoordinates = [];
  for (let i = 0; i < simplifiedFlatCoordinates.length - 2; i += 2) {
    if (
      Number.isNaN(simplifiedFlatCoordinates[i]) ||
      Number.isNaN(simplifiedFlatCoordinates[i + 1])
    ) {
      continue;
    }
    simplifiedCoordinates.push([
      simplifiedFlatCoordinates[i],
      simplifiedFlatCoordinates[i + 1],
    ]);
  }
  if (simplifiedCoordinates.length <= 1) {
    simplifiedCoordinates = [points[0], points[points.length - 1]];
  }
  // if (
  //   simplifiedCoordinates[0][0] !== points[0][0] ||
  //   simplifiedCoordinates[0][1] !== points[0][1]
  // ) {
  //   simplifiedCoordinates.unshift(points[0]);
  // }
  // if (
  //   simplifiedCoordinates[simplifiedCoordinates.length - 1][0] !==
  //     points[points.length - 1][0] ||
  //   simplifiedCoordinates[simplifiedCoordinates.length - 1][1] !==
  //     points[points.length - 1][1]
  // ) {
  //   simplifiedCoordinates.push(points[points.length - 1]);
  // }
  return simplifiedCoordinates;
}
