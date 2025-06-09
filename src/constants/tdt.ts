export const tdtKey = "bea0c0310f3478b0a79d7e594f741fa6";
export const tdtUrl = `https://api.tianditu.gov.cn/api?v=4.0&tk=${tdtKey}`;
export const tdtPositionUrl = `https://api.tianditu.gov.cn/geocoder?postStr={'lon':{lng},'lat':{lat},'ver':1}&type=geocode&tk=${tdtKey}`;
// 冒号 %3A 斜杠 %2F 问号 %3F 等于 %3D 和 %26
// 矢量底图
export const tdtXYZVECUrl = `https://t0.tianditu.gov.cn/DataServer?T=vec_w&x={x}&y={y}&l={z}&tk=${tdtKey}`;
// 矢量注记
export const tdtXYZCVAUrl = `https://t0.tianditu.gov.cn/DataServer?T=cva_w&x={x}&y={y}&l={z}&tk=${tdtKey}`;
// 影像注记
export const tdtXYZCIAUrl = `https://t0.tianditu.gov.cn/DataServer?T=cia_w&x={x}&y={y}&l={z}&tk=${tdtKey}`;

export const tdtSearchUrl = `https://api.tianditu.gov.cn/v2/search?postStr={"keyWord":"{keyword}","level":12,"mapBound":"-180,-90,180,90","queryType":4,"start":0,"count":20,"show":1}&type=query&tk=${tdtKey}`;
// 地理编码查询
export const tdtGeoSearchUrl = `https://api.tianditu.gov.cn/geocoder?ds={"keyWord":"{keyword}"}&tk=${tdtKey}`;
// 视野内搜索
export const tdtViewSearchUrl = `https://api.tianditu.gov.cn/v2/search?postStr={"keyWord":"{keyword}","queryRadius":"{queryRadius}","pointLonlat":"{pointLonlat}","queryType":3,"start":0,"count":20,"show":1}&type=query&tk=${tdtKey}`;

export const tdtDriveUrl = `https://api.tianditu.gov.cn/drive?postStr={"orig":"{orig}","dest":"{dest}","style":"0"}&type=search&tk=${tdtKey}`;
