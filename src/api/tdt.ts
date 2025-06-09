import {
  tdtPositionUrl,
  tdtXYZVECUrl,
  tdtXYZCVAUrl,
  tdtSearchUrl,
  tdtViewSearchUrl,
  tdtXYZCIAUrl,
  tdtDriveUrl,
  tdtGeoSearchUrl,
} from "@/constants/tdt";
import { AddressType, GeoAdressType } from "@/data/address";
import { TDTDrivePath, TDTDriveSubPath } from "@/data/drivePath";
import { useDisplayStore } from "@/store/displayStore";
import { LRUCache } from "@/utils/lruCache";
import { getProxyPort, getProxyUrl } from "@/utils/proxyUrl";
import { fetch } from "@tauri-apps/plugin-http";

const lruCache = new LRUCache<string>({
  storeName: "tdtCache",
  maxItems: 400,
  defaultTTL: 86400000,
  cleanupInterval: 60000,
});

function encodeUrl(url: string): string {
  return encodeURIComponent(url).replace(/%7B/g, "{").replace(/%7D/g, "}");
}

export async function getCurrentLngLat(): Promise<{
  lng: number;
  lat: number;
} | null> {
  if (!navigator.geolocation) return null;
  return await new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lng: position.coords.longitude,
          lat: position.coords.latitude,
        });
      },
      (error) => {
        reject(error);
      }
    );
  });
}

export async function getLngLatAddress(lonlat: {
  lng: number;
  lat: number;
}): Promise<AddressType | undefined> {
  const url = tdtPositionUrl
    .replace("{lng}", lonlat.lng.toPrecision())
    .replace("{lat}", lonlat.lat.toPrecision());
  const displayStore = useDisplayStore();
  let _fetch = window.fetch;
  let options = undefined;
  if (!displayStore.isWeb) {
    _fetch = fetch;
    options = {
      headers: {
        "Access-Control-Allow-Origin": "*",
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "upgrade-insecure-requests": "1",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
      },
    };
  }
  const response = await _fetch(url, options);
  const data = await response.json();

  if (!data.result.formatted_address) return;
  return {
    address: data.result.formatted_address.replace(" ", "-"),
    coordinates: {
      lng: data.result.location.lon,
      lat: data.result.location.lat,
    },
    name:
      data.result.addressComponent.poi || data.result.addressComponent.address,
  };
}

export async function getCurrentLocation() {
  const coord = await getCurrentLngLat();
  if (!coord) return;
  return await getLngLatAddress(coord);
}

export async function tdtXYZPoxyVECUrl() {
  const displayStore = useDisplayStore();
  if (displayStore.isWeb) {
    return tdtXYZVECUrl;
  } else {
    const port = await getProxyPort();
    const proxyUrl =
      `http://127.0.0.1:${port}/proxy/_/` + encodeUrl(tdtXYZVECUrl);
    return proxyUrl;
  }
}

export async function tdtXYZPoxyCVAUrl() {
  const displayStore = useDisplayStore();
  if (displayStore.isWeb) {
    return tdtXYZCVAUrl;
  } else {
    const port = await getProxyPort();
    const proxyUrl =
      `http://127.0.0.1:${port}/proxy/_/` + encodeUrl(tdtXYZCVAUrl);
    return proxyUrl;
  }
}

export async function tdtXYZPoxyCIAUrl() {
  const displayStore = useDisplayStore();
  if (displayStore.isWeb) {
    return tdtXYZCIAUrl;
  } else {
    const port = await getProxyPort();
    const proxyUrl =
      `http://127.0.0.1:${port}/proxy/_/` + encodeUrl(tdtXYZCIAUrl);
    return proxyUrl;
  }
}

export async function tdtSearch(
  keyword: string,
  queryRadius?: string,
  pointLonlat?: string
): Promise<AddressType[]> {
  const url = tdtSearchUrl.replace("{keyword}", keyword);
  try {
    const displayStore = useDisplayStore();
    let _fetch = window.fetch;
    let options = undefined;
    if (!displayStore.isWeb) {
      _fetch = fetch;
      options = {
        headers: {
          "Access-Control-Allow-Origin": "*",
          accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "upgrade-insecure-requests": "1",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
        },
      };
    }
    const response = await _fetch(url, options);
    const data = await response.json();
    const addressList =
      data.suggests?.map((item: any) => {
        const [lon, lat] = item.lonlat.split(",");
        return {
          name: item.name,
          address: item.address,
          coordinates: {
            lng: Number(lon),
            lat: Number(lat),
          },
        } as AddressType;
      }) || [];
    if (queryRadius && pointLonlat) {
      const viewAddressList = await tdtViewSearch(
        keyword,
        queryRadius,
        pointLonlat
      );
      return [...viewAddressList, ...addressList];
    } else {
      return addressList;
    }
  } catch (error) {
    console.error("tdtSearch error:", error);
    return [];
  }
}

export async function tdtViewSearch(
  keyword: string,
  queryRadius: string,
  pointLonlat: string
): Promise<AddressType[]> {
  const url = tdtViewSearchUrl
    .replace("{keyword}", keyword)
    .replace("{queryRadius}", queryRadius)
    .replace("{pointLonlat}", pointLonlat);
  try {
    const displayStore = useDisplayStore();
    let _fetch = window.fetch;
    let options = undefined;
    if (!displayStore.isWeb) {
      _fetch = fetch;
      options = {
        headers: {
          "Access-Control-Allow-Origin": "*",
          accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "upgrade-insecure-requests": "1",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
        },
      };
    }
    const response = await _fetch(url, options);
    const data = await response.json();
    return (
      data.pois?.map((item: any) => {
        const [lon, lat] = item.lonlat.split(",");
        return {
          name: item.name,
          address: item.address,
          coordinates: {
            lng: Number(lon),
            lat: Number(lat),
          },
        } as AddressType;
      }) || []
    );
  } catch (error) {
    console.error("tdtSearch error:", error);
    return [];
  }
}

export async function tdtGeoSearch(
  keyword: string
): Promise<GeoAdressType | undefined> {
  const url = tdtGeoSearchUrl.replace("{keyword}", keyword);

  try {
    const displayStore = useDisplayStore();
    let _fetch = window.fetch;
    let options = undefined;
    if (!displayStore.isWeb) {
      _fetch = fetch;
      options = {
        headers: {
          "Access-Control-Allow-Origin": "*",
          accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "upgrade-insecure-requests": "1",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
        },
      };
    }
    const response = await _fetch(url, options);
    const data = await response.json();

    return data.location;
  } catch (error) {
    console.error("tdtGeoSearch error:", error);
    return;
  }
}

export async function tdtDrivePath(
  orig: { lng: number; lat: number },
  dest: { lng: number; lat: number },
  addStartEnd = true // 是否自动加上开始结束位置
): Promise<TDTDrivePath | undefined> {
  const url = tdtDriveUrl
    .replace("{orig}", `${orig.lng},${orig.lat}`)
    .replace("{dest}", `${dest.lng},${dest.lat}`);
  let data = await lruCache.get(url);
  if (!data) {
    const displayStore = useDisplayStore();
    let _fetch = window.fetch;
    let options = undefined;
    if (!displayStore.isWeb) {
      _fetch = fetch;
      options = {
        headers: {
          "Access-Control-Allow-Origin": "*",
          accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "upgrade-insecure-requests": "1",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
        },
      };
    }
    try {
      const response = await _fetch(url, options);
      data = await response.text();
      if (data) {
        await lruCache.set(url, data);
      }
    } catch (error) {
      console.error(`get tdtDrivePath failed: ${error}`);
      return undefined;
    }
  }

  let parser = new DOMParser();
  let xmlDoc = parser.parseFromString(data, "application/xml");
  const items: TDTDriveSubPath[] = [];
  if (addStartEnd) {
    items.push({
      lon: orig.lng,
      lat: orig.lat,
    });
  }
  xmlDoc.querySelectorAll("simple item").forEach((item) => {
    const guide = item.querySelector("strguide")?.textContent;
    const streetName = item.querySelector("streetNames")?.textContent;
    const [lon, lat] = item
      .querySelector("turnlatlon")
      ?.textContent?.split(",") || [undefined, undefined];
    const distance = item.querySelector("streetDistance")?.textContent;
    const segment = item.querySelector("segmentNumber")?.textContent;
    if (lat && lon) {
      items.push({
        guide,
        streetName,
        lat: Number(lat),
        lon: Number(lon),
        distance: Number(distance),
        segment,
      });
    }
  });
  if (addStartEnd) {
    items.push({
      lon: dest.lng,
      lat: dest.lat,
    });
  }
  const totalDistance = xmlDoc.querySelector(
    "distance:not(simple > distance)"
  )?.textContent;
  const totalDuration = xmlDoc.querySelector(
    "duration:not(simple > duration)"
  )?.textContent;
  let routeLonLat = xmlDoc
    .querySelector("routelatlon")
    ?.textContent?.split(";")
    .map((item) => {
      const [lon, lat] = item.split(",");
      return [Number(lon), Number(lat)];
    });
  if (!routeLonLat) {
    routeLonLat = [
      [orig.lng, orig.lat],
      [dest.lng, dest.lat],
    ];
  }
  const center = xmlDoc
    .querySelector("mapinfo center")
    ?.textContent?.split(",");

  return {
    items: items,
    totalDistance: Number(totalDistance),
    totalDuration: Number(totalDuration),
    routelatlon: routeLonLat,
    center: center ? [Number(center[0]), Number(center[1])] : undefined,
  };
}
