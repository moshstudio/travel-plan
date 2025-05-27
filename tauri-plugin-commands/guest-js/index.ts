import { invoke } from "@tauri-apps/api/core";

export async function exitApp(): Promise<null> {
  await invoke<{ value?: string }>("plugin:commands|exit_app", {
    payload: {},
  });
  return null;
}
