import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/store'
import { APP_TITLE } from '@/constants/app'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/login/index.vue'),
      meta: { public: true }
    },
    {
      path: '/',
      component: () => import('@/views/layout/index.vue'),
      redirect: '/dashboard',
      children: [
        {
          path: 'dashboard',
          name: 'dashboard',
          component: () => import('@/views/dashboard/index.vue'),
          meta: { title: '首页' }
        }
      ]
    },
    {
      path: '/system',
      component: () => import('@/views/layout/index.vue'),
      redirect: '/system/users',
      meta: { title: '系统管理' },
      children: [
        {
          path: 'users',
          name: 'system-users',
          component: () => import('@/views/system/users/index.vue'),
          meta: { title: '用户管理', permission: 'system:user:view' }
        },
        {
          path: 'roles',
          name: 'system-roles',
          component: () => import('@/views/system/roles/index.vue'),
          meta: { title: '角色管理', permission: 'system:role:view' }
        },
        {
          path: 'menus',
          name: 'system-menus',
          component: () => import('@/views/system/menus/index.vue'),
          meta: { title: '菜单管理', permission: 'system:menu:view' }
        },
        {
          path: 'settings',
          name: 'system-settings',
          component: () => import('@/views/system/settings/index.vue'),
          meta: { title: '系统配置', permission: 'system:setting:view' }
        },
        {
          path: 'dictionaries',
          name: 'system-dictionaries',
          component: () => import('@/views/system/dictionaries/index.vue'),
          meta: { title: '字典管理', permission: 'system:dictionary:view' }
        },
        {
          path: 'logs',
          name: 'system-logs',
          component: () => import('@/views/system/logs/index.vue'),
          meta: { title: '操作日志', permission: 'system:log:view' }
        },
        {
          path: 'upload-records',
          name: 'upload-records',
          component: () => import('@/views/system/upload-records/index.vue'),
          meta: { title: '上传记录', permission: 'system:upload-record:view' }
        }
      ]
    },
    {
      path: '/family-doctor',
      component: () => import('@/views/layout/index.vue'),
      redirect: '/family-doctor/household-medicines',
      meta: { title: '家庭医生' },
      children: [
        {
          path: 'medicines',
          name: 'family-doctor-medicines',
          component: () => import('@/views/family-doctor/household-medicines/index.vue'),
          meta: { title: '家庭药品汇总', permission: 'family-doctor:household-medicine:view' }
        },
        {
          path: 'consultations',
          name: 'family-doctor-consultations',
          component: () => import('@/views/family-doctor/consultations/index.vue'),
          meta: { title: '问诊日志', permission: 'family-doctor:consultation:view' }
        },
        {
          path: 'app-users',
          name: 'family-doctor-app-users',
          component: () => import('@/views/family-doctor/app-users/index.vue'),
          meta: { title: 'App 用户', permission: 'family-doctor:app-user:view' }
        },
        {
          path: 'households',
          name: 'family-doctor-households',
          component: () => import('@/views/family-doctor/households/index.vue'),
          meta: { title: '家庭管理', permission: 'family-doctor:household:view' }
        },
        {
          path: 'household-medicines',
          name: 'family-doctor-household-medicines',
          component: () => import('@/views/family-doctor/household-medicines/index.vue'),
          meta: { title: '家庭药箱', permission: 'family-doctor:household-medicine:view' }
        }
      ]
    },
    {
      path: '/redirect',
      component: () => import('@/views/layout/index.vue'),
      meta: { hidden: true },
      children: [
        {
          path: '',
          component: () => import('@/views/layout/components/Redirect.vue'),
          meta: { hidden: true }
        }
      ]
    },
    {
      path: '/:pathMatch(.*)*',
      redirect: '/dashboard'
    }
  ]
})

// 路由守卫
router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore()

  if (to.meta.public) {
    next()
    return
  }

  if (!authStore.isLoggedIn) {
    next({ name: 'login', query: { redirect: to.fullPath } })
    return
  }

  if (!authStore.user) {
    try {
      await authStore.init()
    } catch (error) {
      next({ name: 'login' })
      return
    }
  }

  const permission = to.meta.permission as string | string[] | undefined
  if (!authStore.hasPermission(permission)) {
    next({ path: '/dashboard' })
    return
  }

  next()
})

router.afterEach((to) => {
  const title = to.meta.title as string | undefined
  document.title = title ? `${title} - ${APP_TITLE}` : APP_TITLE
})

export default router
