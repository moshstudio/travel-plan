export const tdtKey = "bea0c0310f3478b0a79d7e594f741fa6";
export const tdtUrl = `https://api.tianditu.gov.cn/api?v=4.0&tk=${tdtKey}`;
export const tdtPositionUrl = `http://api.tianditu.gov.cn/geocoder?postStr={'lon':{lng},'lat':{lat},'ver':1}&type=geocode&tk=${tdtKey}`;
// 冒号 %3A 斜杠 %2F 问号 %3F 等于 %3D 和 %26
// 矢量底图
export const tdtXYZVECUrl = `http%3A%2F%2Ft0.tianditu.gov.cn%2FDataServer%3FT%3Dvec_w%26x%3D{x}%26y%3D{y}%26l%3D{z}%26tk%3D${tdtKey}`;
// 矢量注记
export const tdtXYZCVAUrl = `http%3A%2F%2Ft0.tianditu.gov.cn%2FDataServer%3FT%3Dcva_w%26x%3D{x}%26y%3D{y}%26l%3D{z}%26tk%3D${tdtKey}`;
// 影像注记
export const tdtXYZCIAUrl = `http%3A%2F%2Ft0.tianditu.gov.cn%2FDataServer%3FT%3Dcia_w%26x%3D{x}%26y%3D{y}%26l%3D{z}%26tk%3D${tdtKey}`;

export const tdtSearchUrl = `http://api.tianditu.gov.cn/v2/search?postStr={"keyWord":"{keyword}","level":12,"mapBound":"-180,-90,180,90","queryType":4,"start":0,"count":20,"show":1}&type=query&tk=${tdtKey}`;

export const tdtViewSearchUrl = `http://api.tianditu.gov.cn/v2/search?postStr={"keyWord":"{keyword}","queryRadius":"{queryRadius}","pointLonlat":"{pointLonlat}","queryType":3,"start":0,"count":20,"show":1}&type=query&tk=${tdtKey}`;
