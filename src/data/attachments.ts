export interface AttachmentType {
  type: "image" | "video" | "audio" | "file";
  url: string;
  thumbnail?: string;
}
