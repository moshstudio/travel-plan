import tinycolor from "tinycolor2";
import { Feature, Map } from "ol";
import { LineString, Point } from "ol/geom";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Icon, Stroke, Style } from "ol/style";
import { StyleLike } from "ol/style/Style";
import _ from "lodash";
import { FeatureLike } from "ol/Feature";
import { Coordinate } from "ol/coordinate";
import { fromLonLat } from "ol/proj";

/**
 * 路线绘制插件的配置选项
 */
export interface RouteDrawerOptions {
  /**
   * 地图实例
   */
  map: Map;

  lineLayer: VectorLayer;

  /**
   * 路线颜色，默认为蓝色
   */
  color?: string;

  /**
   * 路线宽度，默认为3
   */
  width?: number;
}

/**
 * OpenLayers 路线绘制插件
 */
export class RouteDrawer {
  private map: Map;
  private lineLayer: VectorLayer<VectorSource>;
  private color: string;
  private width: number;
  private arrowCanvas?: HTMLCanvasElement;

  /**
   * 创建路线绘制插件实例
   * @param options 插件配置选项
   */
  constructor(options: RouteDrawerOptions) {
    this.map = options.map;
    this.lineLayer = options.lineLayer;
    this.color = options.color || "red";
    this.width = options.width || 5;
  }

  /**
   * 绘制路线
   * @param points 路线点数组，格式为 [[lon1, lat1], [lon2, lat2], ...]
   */
  public drawRoute(points: Coordinate[]): void {
    if (points.length < 2) {
      console.warn("至少需要两个点来绘制路线");
      return;
    }
    points = points.map((point) => {
      return fromLonLat(point);
    });

    const lineSource = this.lineLayer.getSource();
    if (!lineSource) return;
    const bottomLineString = new LineString(points);
    const bottomPathStyle = new Style({
      stroke: new Stroke({
        color: tinycolor(this.color).darken(20).toHslString(),
        width: this.width + 2,
      }),
    });

    const bottomFeature = this.drawVectorFeature({
      geom: bottomLineString,
      style: bottomPathStyle,
      kv: {},
    });
    lineSource.addFeature(bottomFeature);

    const upperPathStyle = new Style({
      stroke: new Stroke({
        color: this.color,
        width: this.width,
      }),
    });
    this.arrowCanvas ||= this.drawArrowCanvas();
    const upperLineString = new LineString(points);
    // const upperFeature = new Feature({
    //   geometry: upperLineString,
    // });
    const upperStyles = (feature: FeatureLike, resolution: number) => {
      let lineLength = upperLineString.getLength() / resolution;
      let offset = 100 / lineLength / 2;
      let res = this.createArrowStyle(
        upperLineString,
        this.arrowCanvas!,
        resolution,
        offset
      );
      res.push(upperPathStyle);
      return res;
    };
    const upperFeature = this.drawVectorFeature({
      geom: upperLineString,
      style: upperStyles,
      kv: {},
    });
    lineSource.addFeature(upperFeature);
  }

  private drawArrowCanvas() {
    const opt = {
      color: "rgba(255,255,255,1)",
      lineWidth: 3,
      arrowHeight: 5,
      // 箭头夹角（度）
      angle: 110,
    };
    const singleHeight = opt.arrowHeight / 2;
    // 计算出箭头宽度
    // 计算余切值
    const cotA = 1 / Math.tan((opt.angle * Math.PI) / 360);
    // 使用余切值计算相邻直角边, 箭头偏移宽度
    const offsetWidth = Math.ceil(cotA * singleHeight);
    const arrowWidth = offsetWidth + opt.lineWidth;

    const canvas = document.createElement("canvas");
    canvas.width = arrowWidth;
    canvas.height = opt.arrowHeight;
    let ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.fillStyle = opt.color;
    ctx.strokeStyle = opt.color;
    ctx.beginPath();
    ctx.lineTo(0, 0);
    ctx.lineTo(opt.lineWidth, 0);
    ctx.lineTo(arrowWidth, singleHeight);
    ctx.lineTo(opt.lineWidth, opt.arrowHeight);
    ctx.lineTo(0, opt.arrowHeight);
    ctx.lineTo(offsetWidth, singleHeight);
    ctx.closePath();
    ctx.fill();
    return canvas;
  }

  private createArrowStyle(
    lineString: LineString,
    arrowCanvas: HTMLCanvasElement,
    resolution: number,
    offset: number,
    vectorContext?: any
  ) {
    let resStyles: Style[] = [];
    let lineLength = lineString.getLength() / resolution;
    if (lineLength < 50) {
      return resStyles;
    }
    if (lineLength > 10000) {
      lineLength = 10000;
    }
    let numArr = Math.ceil(lineLength / 100);
    let points = [];
    for (let i = 0; i <= numArr; i++) {
      let fracPos = i / numArr + offset;
      if (fracPos > 1) fracPos -= 1;
      let pg = new Feature({
        geometry: new Point(lineString.getCoordinateAt(fracPos)),
      });
      points.push(pg);
    }
    //确定方向并绘制
    lineString.forEachSegment((start, end) => {
      let line = new LineString([start, end]);
      _.forEach(points, (point) => {
        let coord = point.getGeometry()!.getFirstCoordinate();
        let cPoint = line.getClosestPoint(coord);
        if (
          Math.abs(cPoint[0] - coord[0]) < 1 &&
          Math.abs(cPoint[1] - coord[1]) < 1
        ) {
          let dx = end[0] - start[0];
          let dy = end[1] - start[1];
          let rotation = Math.atan2(dy, dx);
          let arrowStyle = new Style({
            image: new Icon({
              img: arrowCanvas,
              anchor: [1, 0.5],
              rotateWithView: true,
              rotation: -rotation,
              width: arrowCanvas.width,
              height: arrowCanvas.height,
            }),
          });
          if (vectorContext) {
            vectorContext.drawFeature(point, arrowStyle);
          } else {
            arrowStyle.setGeometry(point.getGeometry()!);
            resStyles.push(arrowStyle);
          }
        }
      });
    });

    return resStyles;
  }

  private drawVectorFeature(object: {
    geom: LineString;
    style: StyleLike;
    kv?: Record<string, any>;
  }) {
    const geom = object.geom;
    let feature = new Feature({
      geometry: geom,
    });
    if (object.kv?.id) {
      feature.setId(object.kv.id);
    }
    if (object.style) {
      feature.setStyle(object.style);
    }
    if (object.kv) {
      Object.getOwnPropertyNames(object.kv).forEach(function (key) {
        feature.set(key, object.kv![key]);
      });
    }
    return feature;
  }
}
