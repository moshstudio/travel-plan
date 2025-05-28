import { useStorage } from "@vueuse/core";
import { defineStore } from "pinia";
import { computed } from "vue";
import { type as osType } from "@tauri-apps/plugin-os";

export const useDisplayStore = defineStore("display", () => {
  const isDark = useStorage("isDark", false);
  const activeTabName = useStorage("activeTabName", "plan");
  const isWeb = computed(() => {
    return (window as any).__TAURI_INTERNALS__ === undefined;
  });
  const isAndroid = computed(() => {
    if (isWeb.value) return false;
    return osType() === "android";
  });
  return {
    isDark,
    activeTabName,
    isWeb,
    isAndroid,
  };
});
