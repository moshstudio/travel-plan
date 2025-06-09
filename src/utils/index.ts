import router from "@/router";

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function routerBack(fallbackPath: string = "/") {
  if (window.history.state.back) {
    router.back();
  } else {
    router.replace({ name: fallbackPath });
  }
}
