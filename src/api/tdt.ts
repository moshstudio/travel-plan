import {
  tdtPositionUrl,
  tdtXYZVECUrl,
  tdtXYZCVAUrl,
  tdtSearchUrl,
  tdtViewSearchUrl,
  tdtXYZCIAUrl,
} from "@/constants/tdt";
import { AddressType } from "@/data/address";
import { useDisplayStore } from "@/store/displayStore";
import { getProxyPort, getProxyUrl } from "@/utils/proxyUrl";
import { fetch } from "@tauri-apps/plugin-http";

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
}): Promise<string> {
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
  if (!data.result.formatted_address) {
    return (
      data.result.addressComponent.nation + data.result.addressComponent.address
    );
  }

  return data.result.formatted_address;
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

export async function tdtSearch(keyword: string): Promise<AddressType[]> {
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
    return data.suggests?.map((item: any) => {
      const [lon, lat] = item.lonlat.split(",");
      return {
        name: item.address + " " + item.name,
        address: item.address,
        coordinates: {
          lng: Number(lon),
          lat: Number(lat),
        },
      } as AddressType;
    });
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
    return data.pois?.map((item: any) => {
      const [lon, lat] = item.lonlat.split(",");
      return {
        name: item.address + " " + item.name,
        address: item.address,
        coordinates: {
          lng: Number(lon),
          lat: Number(lat),
        },
      } as AddressType;
    });
  } catch (error) {
    console.error("tdtSearch error:", error);
    return [];
  }
}
