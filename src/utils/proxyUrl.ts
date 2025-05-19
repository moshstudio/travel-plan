import { invoke } from "@tauri-apps/api/core";

export async function getProxyUrl(
  url: string,
  headers?: Record<string, string>
): Promise<string | null> {
  return await invoke("plugin:proxy-plugin|get_proxy_url", {
    url: url,
    headers: Array.from(Object.entries(headers || {})),
  });
}

export async function getProxyPort(): Promise<number | null> {
  return await invoke("plugin:proxy-plugin|get_proxy_port");
}
