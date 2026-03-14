<template>
  <div class="min-h-screen px-4">
    <div class="flex min-h-screen items-center justify-center">
      <div class="w-full max-w-md rounded-[2.5rem] border border-border bg-card p-10 shadow-2xl shadow-black/10">
        <div class="text-center">
          <h1 class="text-3xl font-semibold text-foreground">Exa2api</h1>
          <p class="mt-2 text-sm text-muted-foreground">管理员登录</p>
        </div>

        <form @submit.prevent="handleLogin" class="mt-6 space-y-4">
          <div v-if="!canPasswordLogin" class="rounded-2xl bg-amber-500/10 px-4 py-3 text-sm text-amber-700">
            当前已关闭账号密码登录
          </div>
          <div class="space-y-2">
            <label class="block text-sm font-medium text-foreground">用户名</label>
            <input
              v-model="username"
              type="text"
              required
              class="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="admin 或普通用户名"
              :disabled="isLoading || !canPasswordLogin"
            />
          </div>
          <div class="space-y-2">
            <label class="block text-sm font-medium text-foreground">密码</label>
            <input
              v-model="password"
              type="password"
              required
              class="w-full rounded-2xl border border-input bg-background px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="请输入密码"
              :disabled="isLoading || !canPasswordLogin"
            />
          </div>

          <div v-if="errorMessage" class="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {{ errorMessage }}
          </div>

          <button
            type="submit"
            :disabled="isLoading || !username || !password || !canPasswordLogin"
            class="w-full rounded-2xl bg-primary py-3 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {{ isLoading ? '登录中...' : '登录' }}
          </button>

          <!-- Linux DO OAuth 已移除 -->
        </form>

        <!-- 注册已关闭：不显示注册表单 -->

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { authApi } from '@/api/auth'
import type { AuthOptionsResponse } from '@/types/api'

const router = useRouter()
const authStore = useAuthStore()

const username = ref('admin')
const password = ref('')
const errorMessage = ref('')
const isLoading = ref(false)

const authOptions = ref<AuthOptionsResponse | null>(null)

const canPasswordLogin = computed(() => {
  if (authOptions.value?.password_login_enabled ?? true) return true
  return username.value.trim().toLowerCase() === 'admin'
})

async function loadAuthOptions() {
  try {
    const options = await authApi.options()
    authOptions.value = options
  } catch {
    authOptions.value = {
      registration_enabled: true,
      password_login_enabled: true,
      password_registration_enabled: true,
    }
  }
}


async function handleLogin() {
  if (!canPasswordLogin.value) {
    errorMessage.value = '当前未启用账号密码登录'
    return
  }
  if (!username.value || !password.value) return
  errorMessage.value = ''
  isLoading.value = true
  try {
    await authStore.login(username.value, password.value)
    if (authStore.isAdmin) {
      router.push({ name: 'dashboard' })
    } else {
      router.push({ name: 'apikeys' })
    }
  } catch (error: any) {
    errorMessage.value = error.message || '登录失败'
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  await loadAuthOptions()
})
</script>
