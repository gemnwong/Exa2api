<template>
  <div class="space-y-8">
    <section v-if="isLoading" class="rounded-3xl border border-border bg-card p-6 text-sm text-muted-foreground">
      正在加载设置...
    </section>

    <section v-else class="rounded-3xl border border-border bg-card p-6">
      <div class="flex items-center justify-between">
        <p class="text-base font-semibold text-foreground">配置面板</p>
        <button
          class="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity
                 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="isSaving || !localSettings"
          @click="handleSave"
        >
          保存设置
        </button>
      </div>

      <div v-if="errorMessage" class="mt-4 rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {{ errorMessage }}
      </div>

      <div v-if="localSettings" class="mt-6 space-y-8">
        <div class="grid gap-4 lg:grid-cols-3">
          <div class="space-y-4">
            <div class="rounded-2xl border border-border bg-card p-4">
              <p class="text-xs uppercase tracking-[0.3em] text-muted-foreground">基础</p>
              <div class="mt-4 space-y-3">
                <label class="block text-xs text-muted-foreground">基础地址</label>
                <input
                  v-model="localSettings.basic.base_url"
                  type="text"
                  class="w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
                  placeholder="自动检测或手动填写"
                />
                <!-- Linux DO OAuth 已移除 -->

              </div>
            </div>

            <div class="rounded-2xl border border-border bg-card p-4">
              <p class="text-xs uppercase tracking-[0.3em] text-muted-foreground">重试</p>
              <div class="mt-4 grid grid-cols-2 gap-3 text-sm">
                <label class="col-span-2 text-xs text-muted-foreground">账户切换次数</label>
                <input v-model.number="localSettings.retry.max_account_switch_tries" type="number" min="1" class="col-span-2 rounded-2xl border border-input bg-background px-3 py-2" />

                <label class="col-span-2 text-xs text-muted-foreground">请求冷却（小时）</label>
                <input v-model.number="textRateLimitCooldownHours" type="number" min="1" max="24" step="1" class="col-span-2 rounded-2xl border border-input bg-background px-3 py-2" />

                <label class="col-span-2 text-xs text-muted-foreground">会话缓存秒数</label>
                <input v-model.number="localSettings.retry.session_cache_ttl_seconds" type="number" min="0" class="col-span-2 rounded-2xl border border-input bg-background px-3 py-2" />

              </div>
            </div>

          </div>

          <div class="space-y-4">
            <div class="rounded-2xl border border-border bg-card p-4">
              <p class="text-xs uppercase tracking-[0.3em] text-muted-foreground">公开展示</p>
              <div class="mt-4 space-y-3">
                <label class="block text-xs text-muted-foreground">Logo 地址</label>
                <input
                  v-model="localSettings.public_display.logo_url"
                  type="text"
                  class="w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
                  placeholder="logo 地址"
                />
                <label class="block text-xs text-muted-foreground">会话有效时长</label>
                <input
                  v-model.number="localSettings.session.expire_hours"
                  type="number"
                  min="1"
                  class="w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div class="rounded-2xl border border-border bg-card p-4">
              <p class="text-xs uppercase tracking-[0.3em] text-muted-foreground">说明</p>
              <p class="mt-4 text-sm text-muted-foreground">
                保存后会直接写入配置文件并热更新。修改后请关注日志面板确认是否生效。
              </p>
            </div>

            <div class="rounded-2xl border border-border bg-card p-4">
              <p class="text-xs uppercase tracking-[0.3em] text-muted-foreground">数据库</p>
              <div class="mt-4 space-y-3">
                <button
                  class="w-full rounded-2xl border border-border px-4 py-2 text-sm text-foreground transition-colors hover:border-primary hover:text-primary disabled:opacity-50"
                  :disabled="dbExporting"
                  @click="handleExportDatabase"
                >
                  {{ dbExporting ? '导出中...' : '一键导出数据库（.db）' }}
                </button>
                <input
                  ref="dbFileInput"
                  type="file"
                  accept=".db,.sqlite,.sqlite3,application/octet-stream"
                  class="w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
                />
                <button
                  class="w-full rounded-2xl border border-destructive/40 px-4 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
                  :disabled="dbImporting"
                  @click="handleImportDatabase"
                >
                  {{ dbImporting ? '导入中...' : '一键导入并覆盖数据库' }}
                </button>
                <p class="text-[11px] text-muted-foreground">
                  导入会直接覆盖现有数据库，请先导出备份。
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useSettingsStore } from '@/stores/settings'
import { useToast } from '@/composables/useToast'
import { settingsApi } from '@/api/settings'
import type { Settings } from '@/types/api'

const settingsStore = useSettingsStore()
const { settings, isLoading } = storeToRefs(settingsStore)
const toast = useToast()

const localSettings = ref<Settings | null>(null)
const isSaving = ref(false)
const errorMessage = ref('')
const dbFileInput = ref<HTMLInputElement | null>(null)
const dbExporting = ref(false)
const dbImporting = ref(false)

// 429冷却时间：小时 ↔ 秒 的转换
const DEFAULT_COOLDOWN_HOURS = {
  text: 2,
} as const

const toCooldownHours = (seconds: number | undefined, fallbackHours: number) => {
  if (!seconds) return fallbackHours
  return Math.max(1, Math.round(seconds / 3600))
}

const createCooldownHours = (
  key: 'text_rate_limit_cooldown_seconds' | 'images_rate_limit_cooldown_seconds' | 'videos_rate_limit_cooldown_seconds',
  fallbackHours: number
) => computed({
  get: () => toCooldownHours(localSettings.value?.retry?.[key], fallbackHours),
  set: (hours: number) => {
    if (localSettings.value?.retry) {
      localSettings.value.retry[key] = hours * 3600
    }
  }
})

const textRateLimitCooldownHours = createCooldownHours(
  'text_rate_limit_cooldown_seconds',
  DEFAULT_COOLDOWN_HOURS.text
)

watch(settings, (value) => {
  if (!value) return
  const next = JSON.parse(JSON.stringify(value))
  next.image_generation = next.image_generation || { enabled: false, supported_models: [], output_format: 'base64' }
  next.image_generation.output_format ||= 'base64'
  next.video_generation = next.video_generation || { output_format: 'html' }
  next.video_generation.output_format ||= 'html'
  next.basic = next.basic || {}
  next.basic.duckmail_base_url ||= 'https://api.duckmail.sbs'
  next.basic.duckmail_verify_ssl = next.basic.duckmail_verify_ssl ?? true
  next.basic.refresh_window_hours = Number.isFinite(next.basic.refresh_window_hours)
    ? next.basic.refresh_window_hours
    : 0
  next.retry = next.retry || {}
  next.retry.auto_refresh_accounts_seconds = Number.isFinite(next.retry.auto_refresh_accounts_seconds)
    ? next.retry.auto_refresh_accounts_seconds
    : 0
  localSettings.value = next
})

onMounted(async () => {
  await settingsStore.loadSettings()
})

const handleSave = async () => {
  if (!localSettings.value) return
  errorMessage.value = ''
  isSaving.value = true

  try {
    await settingsStore.updateSettings(localSettings.value)
    toast.success('设置保存成功')
  } catch (error: any) {
    errorMessage.value = error.message || '保存失败'
    toast.error(error.message || '保存失败')
  } finally {
    isSaving.value = false
  }
}

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

const handleExportDatabase = async () => {
  dbExporting.value = true
  try {
    const blob = await settingsApi.exportDatabase()
    const filename = `exa2api-db-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.db`
    downloadBlob(blob, filename)
    toast.success('数据库导出成功')
  } catch (error: any) {
    toast.error(error.message || '数据库导出失败')
  } finally {
    dbExporting.value = false
  }
}

const handleImportDatabase = async () => {
  const file = dbFileInput.value?.files?.[0]
  if (!file) {
    toast.error('请先选择数据库文件')
    return
  }
  const confirmed = window.confirm('导入将覆盖当前数据库，是否继续？')
  if (!confirmed) return
  dbImporting.value = true
  try {
    await settingsApi.importDatabase(file)
    toast.success('数据库导入成功，已覆盖旧数据库')
  } catch (error: any) {
    toast.error(error.message || '数据库导入失败')
  } finally {
    dbImporting.value = false
    if (dbFileInput.value) {
      dbFileInput.value.value = ''
    }
  }
}
</script>

