import { invoke } from "@tauri-apps/api/core";

export async function exitApp(): Promise<null> {
  await invoke<{ value?: string }>("plugin:commands|exit_app", {
    payload: {},
  });
  return null;
}

export async function saveImageToPictures(
  imageData: string,
  filename: string
): Promise<string> {
  return await invoke<string>("plugin:commands|save_image_to_pictures", {
    payload: {
      imageData,
      filename,
    },
  });
}

export async function saveFileToDownloads(
  bytes: string,
  filename: string,
  mimeType: string
): Promise<string> {
  return await invoke<string>("plugin:commands|save_file_to_downloads", {
    payload: { bytes, filename, mimeType },
  });
}
