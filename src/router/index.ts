// router.js
import { createRouter, createWebHashHistory } from "vue-router";

const routes = [
  {
    path: "/",
    redirect: "/plan", // 重定向到/plan
  },
  {
    path: "/plan",
    name: "Plan",
    component: () => import("@/views/plan/index.vue"),
  },
  {
    path: "/add-plan",
    name: "AddPlan",
    component: () => import("@/views/plan/AddPlan.vue"),
  },
  {
    path: "/position-select",
    name: "PositionSelect",
    component: () => import("@/components/map/positionSelect.vue"),
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
});

export default router;
