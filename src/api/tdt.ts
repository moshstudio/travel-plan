import {
  tdtPositionUrl,
  tdtXYZVECUrl,
  tdtXYZCVAUrl,
  tdtSearchUrl,
} from "@/constants/tdt";
import { AddressType } from "@/data/address";
import { getProxyPort, getProxyUrl } from "@/utils/proxyUrl";
import { fetch } from "@tauri-apps/plugin-http";
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

  const response = await fetch(url, {
    headers: {
      accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
      "upgrade-insecure-requests": "1",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
    },
  });
  const data = await response.json();
  return data.result.formatted_address;
}

export async function tdtXYZPoxyVECUrl() {
  const port = await getProxyPort();
  const proxyUrl = `http://127.0.0.1:${port}/proxy/_/` + tdtXYZVECUrl;
  return proxyUrl;
}

export async function tdtXYZPoxyCVAUrl() {
  const port = await getProxyPort();
  const proxyUrl = `http://127.0.0.1:${port}/proxy/_/` + tdtXYZCVAUrl;
  return proxyUrl;
}

export async function tdtSearch(keyword: string): Promise<AddressType[]> {
  const url = tdtSearchUrl.replace("{keyword}", keyword);
  try {
    const response = await fetch(url, {
      headers: {
        accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "upgrade-insecure-requests": "1",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36",
      },
    });
    const data = await response.json();
    console.log(data);
    return data.suggests?.map((item: any) => {
      const [lon, lat] = item.lonlat.split(",");
      return {
        address: item.address + " " + item.name,
        lng: Number(lon),
        lat: Number(lat),
      } as AddressType;
    });
  } catch (error) {
    console.error("tdtSearch error:", error);
    return [];
  }
}
