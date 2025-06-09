import { invoke } from "@tauri-apps/api/core";

export enum FileType {
  image = "image",
  video = "video",
  audio = "audio",
  general_purpose = "general_purpose",
}

export enum ImageSubType {
  pictures = "pictures",
  dcim = "dcim",
}
export enum VideoSubType {
  movies = "movies",
  dcim = "dcim",
}
export enum AudioSubType {
  music = "music",
  alarms = "alarms",
  audiobooks = "audiobooks",
  notifications = "notifications",
  podcasts = "podcasts",
  ringtones = "ringtones",
  recordings = "recordings",
}
export enum GeneralPurposeSubType {
  documents = "documents",
  download = "download",
}
export async function androidSaveFile(
  fileType: FileType,
  subType: ImageSubType | VideoSubType | AudioSubType | GeneralPurposeSubType,
  fileName: string,
  mimeType: string,
  contents: Uint8Array
) {
  return await invoke("plugin:androidfs-plugin|save_file", {
    fileType,
    subType,
    fileName,
    mimeType,
    contents,
  });
  return await invoke("plugin:androidfs-plugin|save_file", {
    file_type: fileType,
    sub_type: subType,
    file_name: fileName,
    mime_type: mimeType,
    contents,
  });
}
