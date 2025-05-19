// router.js
import { createRouter, createWebHashHistory, RouteRecordRaw } from "vue-router";

const routes: RouteRecordRaw[] = [
  {
    path: "/",
    redirect: { name: "Plan" }, // 重定向到plan
  },
  {
    path: "/plan",
    children: [
      {
        path: "",
        name: "Plan",
        component: () => import("@/views/plan/index.vue"),
      },
      {
        path: "add-plan",
        name: "AddPlan",
        component: () => import("@/views/plan/AddPlan.vue"),
      },
      {
        path: "edit-plan/:id",
        name: "EditPlan",
        component: () => import("@/views/plan/EditPlan.vue"),
        props: true,
      },
    ],
  },
  {
    path: "/position-select",
    name: "PositionSelect",
    component: () => import("@/components/map/PositionSelect.vue"),
  },
];

// const routes = [
//   {
//     path: '/',
//     component: () => import('@/layouts/MainLayout.vue'), // 包含导航栏的布局
//     children: [
//       {
//         path: '',
//         name: 'Home',
//         component: () => import('@/views/Home.vue')
//       }
//     ]
//   },
//   {
//     path: '/subpage',
//     name: 'SubPage',
//     component: () => import('@/views/SubPage.vue') // 不包含导航栏的独立页面
//   }
// ]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    } else {
      return { top: 0 };
    }
  },
});

router.beforeEach((to, from, next) => {
  console.log(from, to);
  if (from.path === "/") {
    to.meta.transitionName = "";
  } else {
    if (to.name === "PositionSelect") {
      to.meta.transitionName = "slide-left";
    } else if (from.name === "PositionSelect") {
      to.meta.transitionName = "slide-right";
    } else {
      // 简单的路由深度比较来确定前进/后退
      const toDepth = to.path.split("/").length;
      const fromDepth = from.path.split("/").length;
      to.meta.transitionName =
        toDepth < fromDepth ? "slide-right" : "slide-left";
    }
  }

  next();
});

export default router;
