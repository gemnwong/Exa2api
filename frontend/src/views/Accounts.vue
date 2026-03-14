<template>
  <div class="space-y-8 relative">
    <!-- 全局加载遮罩 -->
    <Teleport to="body">
      <div
        v-if="isOperating"
        class="fixed inset-0 z-[200] flex items-center justify-center bg-background/80 backdrop-blur-sm"
      >
        <div class="flex flex-col items-center gap-4 rounded-2xl border border-border bg-card p-8 shadow-lg">
          <svg class="h-10 w-10 animate-spin text-primary" viewBox="0 0 24 24" fill="none">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <div class="flex flex-col items-center gap-2">
            <p class="text-sm font-medium text-foreground">
              {{ batchProgress ? `处理中 ${batchProgress.current}/${batchProgress.total}` : '操作处理中...' }}
            </p>
            <div v-if="batchProgress" class="w-48 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                class="h-full bg-primary transition-all duration-300"
                :style="{ width: `${(batchProgress.current / batchProgress.total) * 100}%` }"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <section class="rounded-3xl border border-border bg-card p-6">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="grid w-full grid-cols-2 gap-3 sm:flex sm:w-auto sm:items-center">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索账号 ID"
            class="w-full rounded-full border border-input bg-background px-4 py-2 text-sm sm:w-48"
          />
          <SelectMenu
            v-model="statusFilter"
            :options="statusOptions"
            class="!w-full sm:!w-40"
          />
          <SelectMenu
            v-model="sortBy"
            :options="sortOptions"
            class="!w-full sm:!w-44"
          />
        </div>
        <div class="flex w-full flex-wrap items-center gap-3 text-xs text-muted-foreground sm:w-auto sm:flex-nowrap">
          <Checkbox :modelValue="allSelected" @update:modelValue="toggleSelectAll">
            全选
          </Checkbox>
          <span>已选 {{ selectedCount }} / {{ filteredAccounts.length }} 个账号</span>
          <div class="ml-auto flex items-center gap-2 sm:ml-0">
            <button
              type="button"
              class="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors
                     hover:border-primary hover:text-primary"
              :class="viewMode === 'table' ? 'bg-accent text-accent-foreground' : ''"
              @click="viewMode = 'table'"
              aria-label="列表视图"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor">
                <path d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h16v2H4v-2z" />
              </svg>
            </button>
            <button
              type="button"
              class="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors
                     hover:border-primary hover:text-primary"
              :class="viewMode === 'card' ? 'bg-accent text-accent-foreground' : ''"
              @click="viewMode = 'card'"
              aria-label="卡片视图"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" class="h-4 w-4" fill="currentColor">
                <path d="M4 6h7v6H4V6zm9 0h7v6h-7V6zM4 14h7v4H4v-4zm9 0h7v4h-7v-4z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div class="mt-4 flex flex-wrap items-center gap-2">
        <button
          class="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors
                 hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
          :disabled="isLoading"
          @click="refreshAccounts"
        >
          刷新列表
        </button>
        <button
          class="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors
                 hover:border-primary hover:text-primary"
          @click="openConfigPanel"
        >
          账户配置
        </button>
        <button
          class="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors
                 hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
          @click="openRegisterModal"
        >
          添加账户
        </button>

        <div ref="moreActionsRef" class="relative">
          <button
            class="flex items-center gap-2 rounded-full border border-input bg-background px-4 py-2 text-sm font-medium
                   text-foreground transition-colors hover:border-primary"
            :class="showMoreActions ? 'bg-accent text-accent-foreground' : ''"
            @click="toggleMoreActions"
          >
            更多操作
            <svg aria-hidden="true" viewBox="0 0 20 20" class="h-4 w-4" fill="currentColor">
              <path d="M5 7l5 6 5-6H5z" />
            </svg>
          </button>
          <div
            v-if="showMoreActions"
            class="absolute right-0 z-10 mt-2 w-full space-y-1 rounded-2xl border border-border bg-card p-2 shadow-lg"
          >
            <button
              type="button"
              class="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm text-foreground transition-colors
                     hover:bg-accent"
              @click="triggerImportFile(); closeMoreActions()"
            >
              导入文件
            </button>
            <button
              type="button"
              class="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm text-foreground transition-colors
                     hover:bg-accent"
              @click="openExportModal(); closeMoreActions()"
            >
              导出账户
            </button>
            <div class="my-1 border-t border-border/60"></div>
            <button
              type="button"
              class="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors"
              :class="!selectedCount || isOperating
                ? 'cursor-not-allowed text-muted-foreground'
                : 'text-foreground hover:bg-accent'"
              :disabled="!selectedCount || isOperating"
              @click="handleBulkEnable(); closeMoreActions()"
            >
              <span v-if="isOperating" class="flex items-center gap-2">
                <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                处理中...
              </span>
              <span v-else>批量启用</span>
            </button>
            <button
              type="button"
              class="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors"
              :class="!selectedCount || isOperating
                ? 'cursor-not-allowed text-muted-foreground'
                : 'text-foreground hover:bg-accent'"
              :disabled="!selectedCount || isOperating"
              @click="handleBulkDisable(); closeMoreActions()"
            >
              <span v-if="isOperating" class="flex items-center gap-2">
                <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                处理中...
              </span>
              <span v-else>批量禁用</span>
            </button>
            <button
              type="button"
              class="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm transition-colors"
              :class="!selectedCount || isOperating
                ? 'cursor-not-allowed text-muted-foreground'
                : 'text-destructive hover:bg-destructive/10'"
              :disabled="!selectedCount || isOperating"
              @click="handleBulkDelete(); closeMoreActions()"
            >
              <span v-if="isOperating" class="flex items-center gap-2">
                <svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                处理中...
              </span>
              <span v-else>批量删除</span>
            </button>
          </div>
        </div>
      </div>

      <div v-if="viewMode === 'card'" class="mt-6 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        <div
          v-for="account in paginatedAccounts"
          :key="account.id"
          class="rounded-2xl border border-border bg-card p-4"
          :class="rowClass(account)"
          @click="toggleSelect(account.id)"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-xs text-muted-foreground">账号 ID</p>
              <p class="mt-1 font-mono text-xs text-foreground">{{ account.id }}</p>
            </div>
            <Checkbox
              :modelValue="selectedIds.has(account.id)"
              @update:modelValue="toggleSelect(account.id)"
              @click.stop
            />
          </div>

          <div class="mt-4 grid grid-cols-2 gap-3 text-xs text-muted-foreground">
            <div>
              <p>状态</p>
              <p class="mt-1 flex flex-wrap items-center gap-1.5 text-sm font-semibold text-foreground">
                <span
                  class="inline-flex items-center rounded-full border border-border px-2 py-0.5 text-xs"
                  :class="statusClass(account)"
                >
                  {{ statusLabel(account) }}
                </span>
                <span
                  v-if="account.trial_days_remaining != null"
                  class="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-xs font-medium"
                  :class="trialBadgeClass(account.trial_days_remaining)"
                >
                  <svg class="h-3 w-3 shrink-0" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                    <path d="M5 1a1 1 0 0 1 1 1v.5h4V2a1 1 0 0 1 2 0v.5h1A1.5 1.5 0 0 1 14.5 4v9A1.5 1.5 0 0 1 13 14.5H3A1.5 1.5 0 0 1 1.5 13V4A1.5 1.5 0 0 1 3 2.5h1V2a1 1 0 0 1 1-1zm-2 4v1.5h10V5H3zm0 3v5h10V8H3z"/>
                  </svg>
                  {{ account.trial_days_remaining }}天
                </span>
              </p>
            </div>
            <div>
              <p>API Key</p>
              <p class="mt-1 font-mono text-[11px] text-foreground break-all">
                {{ displayApiKey(account.api_key) }}
              </p>
            </div>
            <div>
              <p>策略</p>
              <div class="mt-1">
                <span class="text-xs text-muted-foreground">轮询号池</span>
              </div>
            </div>
            <div>
              <p>失败数</p>
              <p class="mt-1 text-sm font-semibold text-foreground">{{ account.failure_count }}</p>
            </div>
            <div>
              <p>请求数</p>
              <p class="mt-1 text-sm font-semibold text-foreground">{{ account.conversation_count }}</p>
            </div>
          </div>

          <div class="mt-4 flex flex-wrap items-center gap-2">
            <button
              class="rounded-full border border-border px-3 py-1 text-xs text-foreground transition-colors
                     hover:border-primary hover:text-primary"
              @click.stop="openEdit(account.id)"
            >
              编辑
            </button>
            <button
              v-if="shouldShowEnable(account)"
              class="rounded-full border border-border px-3 py-1 text-xs text-foreground transition-colors
                     hover:border-primary hover:text-primary"
              @click.stop
              @click="handleEnable(account.id)"
            >
              启用
            </button>
            <button
              v-else
              class="rounded-full border border-border px-3 py-1 text-xs text-foreground transition-colors
                     hover:border-primary hover:text-primary"
              @click.stop
              @click="handleDisable(account.id)"
            >
              禁用
            </button>
            <button
              class="rounded-full border border-border px-3 py-1 text-xs text-destructive transition-colors
                     hover:border-destructive hover:text-destructive"
              @click.stop
              @click="handleDelete(account.id)"
            >
              删除
            </button>
          </div>
        </div>
        <div v-if="!filteredAccounts.length && !isLoading" class="rounded-2xl border border-border bg-background p-4 text-center text-xs text-muted-foreground">
          暂无账号数据，请检查后台配置。
        </div>
      </div>

      <div v-else class="relative mt-6 overflow-x-auto overflow-y-visible">
        <table class="min-w-full text-left text-sm">
          <thead class="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            <tr>
              <th class="py-3 pr-4">
                <Checkbox :modelValue="allSelected" @update:modelValue="toggleSelectAll" />
              </th>
              <th class="py-3 pr-6">账号 ID</th>
              <th class="py-3 pr-6">状态</th>
              <th class="py-3 pr-6">API Key</th>
              <th class="py-3 pr-6">策略</th>
              <th class="py-3 pr-6">失败数</th>
              <th class="py-3 pr-6">请求数</th>
              <th class="py-3 text-right">操作</th>
            </tr>
          </thead>
          <tbody class="text-sm text-foreground">
            <tr v-if="!filteredAccounts.length && !isLoading">
              <td colspan="8" class="py-8 text-center text-muted-foreground">
                暂无账号数据，请检查后台配置。
              </td>
            </tr>
            <tr
              v-for="account in paginatedAccounts"
              :key="account.id"
              class="border-t border-border"
              :class="rowClass(account)"
              @click="toggleSelect(account.id)"
            >
              <td class="py-4 pr-4" @click.stop>
                <Checkbox
                  :modelValue="selectedIds.has(account.id)"
                  @update:modelValue="toggleSelect(account.id)"
                />
              </td>
              <td class="py-4 pr-6 font-mono text-xs text-foreground">
                {{ account.id }}
              </td>
              <td class="py-4 pr-6">
                <div class="flex flex-wrap items-center gap-1.5">
                  <span
                    class="inline-flex items-center rounded-full border border-border px-3 py-1 text-xs"
                    :class="statusClass(account)"
                  >
                    {{ statusLabel(account) }}
                  </span>
                  <span
                    v-if="account.trial_days_remaining != null"
                    class="inline-flex items-center gap-1 rounded-full border border-border px-2 py-1 text-xs font-medium"
                    :class="trialBadgeClass(account.trial_days_remaining)"
                  >
                    <svg class="h-3 w-3 shrink-0" viewBox="0 0 16 16" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                      <path d="M5 1a1 1 0 0 1 1 1v.5h4V2a1 1 0 0 1 2 0v.5h1A1.5 1.5 0 0 1 14.5 4v9A1.5 1.5 0 0 1 13 14.5H3A1.5 1.5 0 0 1 1.5 13V4A1.5 1.5 0 0 1 3 2.5h1V2a1 1 0 0 1 1-1zm-2 4v1.5h10V5H3zm0 3v5h10V8H3z"/>
                    </svg>
                    {{ account.trial_days_remaining }}天
                  </span>
                </div>
              </td>
              <td class="py-4 pr-6">
                <div class="font-mono text-[11px] break-all text-foreground">
                  {{ displayApiKey(account.api_key) }}
                </div>
              </td>
              <td class="py-4 pr-6 text-xs text-muted-foreground">
                轮询号池
              </td>
              <td class="py-4 pr-6 text-xs text-muted-foreground">
                {{ account.failure_count }}
              </td>
              <td class="py-4 pr-6 text-xs text-muted-foreground">
                {{ account.conversation_count }}
              </td>
              <td class="py-4 text-right">
                <div class="flex flex-wrap justify-end gap-2">
                  <button
                    class="rounded-full border border-border px-3 py-1 text-xs text-foreground transition-colors
                           hover:border-primary hover:text-primary"
                    @click.stop="openEdit(account.id)"
                  >
                    编辑
                  </button>
                  <button
                    v-if="shouldShowEnable(account)"
                    class="rounded-full border border-border px-3 py-1 text-xs text-foreground transition-colors
                           hover:border-primary hover:text-primary"
                    @click.stop="handleEnable(account.id)"
                  >
                    启用
                  </button>
                  <button
                    v-else
                    class="rounded-full border border-border px-3 py-1 text-xs text-foreground transition-colors
                           hover:border-primary hover:text-primary"
                    @click.stop="handleDisable(account.id)"
                  >
                    禁用
                  </button>
                  <button
                    class="rounded-full border border-border px-3 py-1 text-xs text-destructive transition-colors
                           hover:border-destructive hover:text-destructive"
                    @click.stop="handleDelete(account.id)"
                  >
                    删除
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination Controls -->
      <div v-if="filteredAccounts.length > pageSize" class="mt-6 flex items-center justify-between">
        <div class="text-sm text-muted-foreground">
          显示 {{ (currentPage - 1) * pageSize + 1 }}-{{ Math.min(currentPage * pageSize, filteredAccounts.length) }} / 共 {{ filteredAccounts.length }} 个账户
        </div>
        <div class="flex items-center gap-2">
          <button
            class="rounded-full border border-border px-4 py-2 text-sm transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="currentPage === 1"
            @click="currentPage--"
          >
            上一页
          </button>
          <span class="text-sm text-muted-foreground">{{ currentPage }} / {{ totalPages }}</span>
          <button
            class="rounded-full border border-border px-4 py-2 text-sm transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="currentPage === totalPages"
            @click="currentPage++"
          >
            下一页
          </button>
        </div>
      </div>
    </section>
  </div>
  <Teleport to="body">
    <div v-if="isRegisterOpen" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 px-4">
      <div class="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-xl">
        <div class="flex items-center justify-between border-b border-border/60 px-6 py-4">
          <div>
            <p class="text-sm font-medium text-foreground">添加账户</p>
            <p class="mt-1 text-xs text-muted-foreground">批量导入账户配置</p>
          </div>
          <button
            class="text-xs text-muted-foreground transition-colors hover:text-foreground"
            @click="closeRegisterModal"
          >
            关闭
          </button>
        </div>

        <div class="scrollbar-slim flex-1 overflow-y-auto px-6 py-4">
          <div class="space-y-4 text-sm">
          <div class="space-y-4">
            <label class="block text-xs text-muted-foreground">批量导入（每行一个）</label>
            <div class="flex items-center gap-2">
              <button
                type="button"
                class="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground transition-colors
                       hover:border-primary hover:text-primary"
                @click="triggerImportFile"
              >
                上传文件
              </button>
              <span v-if="importFileName" class="text-xs text-muted-foreground">{{ importFileName }}</span>
            </div>
            <textarea
              v-model="importText"
              class="min-h-[140px] w-full rounded-2xl border border-input bg-background px-3 py-2 text-xs font-mono"
              placeholder="duckmail----you@example.com----password&#10;moemail----you@moemail.app----emailId&#10;freemail----you@freemail.local&#10;gptmail----you@example.com&#10;cfmail----you@example.com----jwtToken&#10;xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx&#10;user@outlook.com----loginPassword----clientId----refreshToken"
            ></textarea>
            <div class="rounded-2xl border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              <p>支持以下格式：</p>
              <p class="mt-1 font-mono">duckmail----email----password</p>
              <p class="mt-1 font-mono">moemail----email----emailId</p>
              <p class="mt-1 font-mono">freemail----email</p>
              <p class="mt-1 font-mono">gptmail----email</p>
              <p class="mt-1 font-mono">cfmail----email----jwtToken</p>
              <p class="mt-1 font-mono">apiKey（每行一个）</p>
              <p class="mt-1 font-mono">email----password----clientId----refreshToken</p>
              <p class="mt-2">导入仅用于账号配置管理。</p>
            </div>
            <div v-if="importError" class="rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-600">
              {{ importError }}
            </div>
          </div>
          </div>
        </div>

        <div class="border-t border-border/60 px-6 py-4">
          <div class="flex items-center justify-end gap-2">
            <button
              class="rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition-colors
                     hover:border-primary hover:text-primary"
              @click="closeRegisterModal"
            >
              取消
            </button>
            <button
              class="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity
                     hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="isImporting"
              @click="handleImport"
            >
              导入并保存
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>

  <Teleport to="body">
    <div v-if="isEditOpen" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 px-4">
      <div class="w-full max-w-lg rounded-3xl border border-border bg-card p-6 shadow-xl">
        <div class="flex items-center justify-between">
          <p class="text-sm font-medium text-foreground">编辑账号</p>
          <button
            class="text-xs text-muted-foreground transition-colors hover:text-foreground"
            @click="closeEdit"
          >
            关闭
          </button>
        </div>

        <div v-if="editError" class="mt-4 rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {{ editError }}
        </div>

        <div class="mt-4 space-y-3 text-sm">
          <label class="block text-xs text-muted-foreground">账号 ID</label>
          <input
            v-model="editForm.id"
            type="text"
            class="w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
            disabled
          />

          <label class="block text-xs text-muted-foreground">secure_c_ses</label>
          <textarea
            v-model="editForm.secure_c_ses"
            class="w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
            rows="3"
          ></textarea>

          <label class="block text-xs text-muted-foreground">csesidx</label>
          <input
            v-model="editForm.csesidx"
            type="text"
            class="w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
          />

          <label class="block text-xs text-muted-foreground">config_id</label>
          <input
            v-model="editForm.config_id"
            type="text"
            class="w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
          />

          <label class="block text-xs text-muted-foreground">host_c_oses</label>
          <input
            v-model="editForm.host_c_oses"
            type="text"
            class="w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
          />

          <label class="block text-xs text-muted-foreground">exa_api_key</label>
          <input
            v-model="editForm.exa_api_key"
            type="text"
            class="w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm"
            placeholder="exa_xxx"
          />
        </div>

        <div class="mt-6 flex items-center justify-end gap-2">
          <button
            class="rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition-colors
                   hover:border-primary hover:text-primary"
            @click="closeEdit"
          >
            取消
          </button>
          <button
            class="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity
                   hover:opacity-90"
            @click="saveEdit"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  </Teleport>

  <Teleport to="body">
    <div v-if="isConfigOpen" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 px-4">
      <div class="w-full max-w-3xl rounded-3xl border border-border bg-card p-6 shadow-xl">
        <div class="flex items-center justify-between">
          <p class="text-sm font-medium text-foreground">账户配置（JSON）</p>
          <div class="flex items-center gap-2">
            <button
              class="rounded-full bg-foreground px-3 py-1 text-xs text-background transition-opacity
                     hover:opacity-90"
              @click="toggleConfigMask"
            >
              {{ configMasked ? '显示原文' : '脱敏显示' }}
            </button>
            <button
              class="text-xs text-muted-foreground transition-colors hover:text-foreground"
              @click="closeConfigPanel"
            >
              关闭
            </button>
          </div>
        </div>

        <div v-if="configError" class="mt-4 rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {{ configError }}
        </div>

        <div class="mt-4">
          <textarea
            v-model="configJson"
            class="h-96 w-full rounded-2xl border border-input bg-background px-4 py-3 font-mono text-xs text-foreground"
            spellcheck="false"
            :readonly="configMasked"
          ></textarea>
        </div>

        <div class="mt-6 flex items-center justify-end gap-2">
          <button
            class="rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition-colors
                   hover:border-primary hover:text-primary"
            @click="closeConfigPanel"
          >
            取消
          </button>
          <button
            class="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity
                   hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            @click="saveConfigPanel"
            :disabled="configMasked"
          >
            保存
          </button>
        </div>
      </div>
    </div>
  </Teleport>
  <Teleport to="body">
    <div v-if="isExportOpen" class="fixed inset-0 z-[100] flex items-center justify-center bg-black/30 px-4">
      <div class="flex max-h-[90vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-xl">
        <div class="flex items-center justify-between border-b border-border/60 px-6 py-4">
          <div>
            <p class="text-sm font-medium text-foreground">导出账号配置</p>
            <p class="mt-1 text-xs text-muted-foreground">选择导出范围与格式</p>
          </div>
          <button
            class="text-xs text-muted-foreground transition-colors hover:text-foreground"
            @click="closeExportModal"
          >
            关闭
          </button>
        </div>
        <div class="scrollbar-slim flex-1 overflow-y-auto px-6 py-4">
          <div class="space-y-4 text-sm">
            <div class="flex rounded-full border border-border bg-muted/30 p-1 text-xs">
              <button
                type="button"
                class="flex-1 rounded-full px-3 py-2 font-medium transition-colors"
                :class="exportScope === 'all' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'"
                @click="exportScope = 'all'"
              >
                全部
              </button>
              <button
                type="button"
                class="flex-1 rounded-full px-3 py-2 font-medium transition-colors"
                :class="exportScope === 'selected' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'"
                :disabled="!selectedCount"
                @click="exportScope = 'selected'"
              >
                选中
              </button>
            </div>

            <div class="flex rounded-full border border-border bg-muted/30 p-1 text-xs">
              <button
                type="button"
                class="flex-1 rounded-full px-3 py-2 font-medium transition-colors"
                :class="exportFormat === 'json' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'"
                @click="exportFormat = 'json'"
              >
                JSON
              </button>
              <button
                type="button"
                class="flex-1 rounded-full px-3 py-2 font-medium transition-colors"
                :class="exportFormat === 'txt' ? 'bg-foreground text-background' : 'text-muted-foreground hover:text-foreground'"
                @click="exportFormat = 'txt'"
              >
                TXT
              </button>
            </div>
            <p class="text-xs text-muted-foreground">
              选中导出仅包含当前已勾选账号（{{ selectedCount }} 个）。
            </p>
            <p class="text-xs text-muted-foreground">
              <template v-if="exportFormat === 'json'">
                JSON 格式包含完整数据（Cookie、Token、过期时间等），导入后无需重新刷新。
              </template>
              <template v-else>
                TXT 格式仅导出邮箱和密码，导入后需要重新刷新获取 Cookie。
              </template>
            </p>
          </div>
        </div>
        <div class="border-t border-border/60 px-6 py-4">
          <div class="flex items-center justify-end gap-2">
            <button
              class="rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition-colors
                     hover:border-primary hover:text-primary"
              @click="closeExportModal"
            >
              取消
            </button>
            <button
              class="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity
                     hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="exportScope === 'selected' && !selectedCount"
              @click="runExport"
            >
              开始导出
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
  <input
    ref="importFileInput"
    type="file"
    class="hidden"
    accept=".txt,.json,application/json,text/plain"
    multiple
    @change="handleImportFile"
  />
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { useAccountsStore } from '@/stores/accounts'
import SelectMenu from '@/components/ui/SelectMenu.vue'
import Checkbox from '@/components/ui/Checkbox.vue'
import ConfirmDialog from '@/components/ui/ConfirmDialog.vue'
import { useConfirmDialog } from '@/composables/useConfirmDialog'
import { useToast } from '@/composables/useToast'
import { accountsApi } from '@/api'
import type { AdminAccount, AccountConfigItem } from '@/types/api'

const accountsStore = useAccountsStore()
const { accounts, isLoading, isOperating, batchProgress } = storeToRefs(accountsStore)
const confirmDialog = useConfirmDialog()
const toast = useToast()

const searchQuery = ref('')
const statusFilter = ref('all')
const sortBy = ref(localStorage.getItem('accounts_sort_by') || 'default')
watch(sortBy, (val) => localStorage.setItem('accounts_sort_by', val))
const selectedIds = ref<Set<string>>(new Set())
const viewMode = ref<'table' | 'card'>((localStorage.getItem('accounts_view_mode') as 'table' | 'card') || 'table')
watch(viewMode, (val) => localStorage.setItem('accounts_view_mode', val))
const currentPage = ref(1)
const pageSize = ref(50)
const isEditOpen = ref(false)
const editError = ref('')
const isConfigOpen = ref(false)
const configError = ref('')
const configJson = ref('')
const configMasked = ref(false)
const configData = ref<AccountConfigItem[]>([])
const isRegisterOpen = ref(false)
const importText = ref('')
const importError = ref('')
const isImporting = ref(false)
const importFileInput = ref<HTMLInputElement | null>(null)
const importFileName = ref('')
const isExportOpen = ref(false)
const exportScope = ref<'all' | 'selected'>('all')
const exportFormat = ref<'json' | 'txt'>('json')
const showMoreActions = ref(false)
const moreActionsRef = ref<HTMLDivElement | null>(null)
const editForm = ref<AccountConfigItem>({
  id: '',
  secure_c_ses: '',
  csesidx: '',
  config_id: '',
  host_c_oses: '',
  exa_api_key: '',
})
const editIndex = ref<number | null>(null)
const configAccounts = ref<AccountConfigItem[]>([])
const statusOptions = [
  { label: '全部状态', value: 'all' },
  { label: '正常', value: '正常' },
  { label: '手动禁用', value: '手动禁用' },
  { label: '403 禁用', value: '403 禁用' },
]

const sortOptions = [
  { label: '默认排序', value: 'default' },
  { label: 'API Key ↑', value: 'apikey_asc' },
  { label: 'API Key ↓', value: 'apikey_desc' },
  { label: '成功率 ↑', value: 'success_rate_asc' },
  { label: '成功率 ↓', value: 'success_rate_desc' },
  { label: '请求数 ↑', value: 'conversation_asc' },
  { label: '请求数 ↓', value: 'conversation_desc' },
  { label: '错误数 ↑', value: 'error_asc' },
  { label: '错误数 ↓', value: 'error_desc' },
]

const filteredAccounts = computed(() => {
  const query = searchQuery.value.trim().toLowerCase()
  let filtered = accounts.value.filter(account => {
    const matchesQuery = !query || account.id.toLowerCase().includes(query)
    const matchesStatus = statusFilter.value === 'all' || statusLabel(account) === statusFilter.value
    return matchesQuery && matchesStatus
  })

  // 排序逻辑
  if (sortBy.value !== 'default') {
    filtered = [...filtered].sort((a, b) => {
      const getSuccessRate = (acc: AdminAccount) => {
        const total = (acc.conversation_count || 0) + (acc.error_count || 0)
        return total > 0 ? (acc.conversation_count || 0) / total : 0
      }

      switch (sortBy.value) {
        case 'apikey_asc':
          return (a.api_key || '').localeCompare(b.api_key || '')
        case 'apikey_desc':
          return (b.api_key || '').localeCompare(a.api_key || '')
        case 'success_rate_asc':
          return getSuccessRate(a) - getSuccessRate(b)
        case 'success_rate_desc':
          return getSuccessRate(b) - getSuccessRate(a)
        case 'conversation_asc':
          return (a.conversation_count || 0) - (b.conversation_count || 0)
        case 'conversation_desc':
          return (b.conversation_count || 0) - (a.conversation_count || 0)
        case 'error_asc':
          return (a.error_count || 0) - (b.error_count || 0)
        case 'error_desc':
          return (b.error_count || 0) - (a.error_count || 0)
        default:
          return 0
      }
    })
  }

  return filtered
})

const totalPages = computed(() => Math.ceil(filteredAccounts.value.length / pageSize.value))

const paginatedAccounts = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredAccounts.value.slice(start, end)
})

const selectedCount = computed(() => selectedIds.value.size)
const allSelected = computed(() =>
  filteredAccounts.value.length > 0 && filteredAccounts.value.every(account => selectedIds.value.has(account.id))
)

watch([searchQuery, statusFilter, sortBy], () => {
  currentPage.value = 1
})

const refreshAccounts = async () => {
  await accountsStore.loadAccounts()
  selectedIds.value = new Set()
  showMoreActions.value = false
}


const openRegisterModal = () => {
  isRegisterOpen.value = true
  importText.value = ''
  importError.value = ''
  isImporting.value = false
  importFileName.value = ''
}

const openExportModal = (format: 'json' | 'txt' = 'json') => {
  exportFormat.value = format
  exportScope.value = 'all'
  isExportOpen.value = true
}

const closeExportModal = () => {
  isExportOpen.value = false
}

const closeRegisterModal = () => {
  isRegisterOpen.value = false
}

const parseImportLines = (raw: string) => {
  const items: AccountConfigItem[] = []
  const errors: string[] = []
  const lines = raw.split(/\r?\n/).map(line => line.trim()).filter(Boolean)

  lines.forEach((line, index) => {
    const parts = line.split('----').map(part => part.trim())
    const lineNo = index + 1

    if (!parts.length) return

    if (parts[0].toLowerCase() === 'duckmail') {
      if (parts.length < 3 || !parts[1] || !parts[2]) {
        errors.push(`第 ${lineNo} 行格式错误（duckmail）`)
        return
      }
      const email = parts[1]
      const password = parts.slice(2).join('----')
      items.push({
        id: email,
        secure_c_ses: '',
        csesidx: '',
        config_id: '',
        mail_provider: 'duckmail',
        mail_address: email,
        mail_password: password,
      })
      return
    }

    if (parts[0].toLowerCase() === 'moemail') {
      if (parts.length < 3 || !parts[1] || !parts[2]) {
        errors.push(`第 ${lineNo} 行格式错误（moemail）`)
        return
      }
      const email = parts[1]
      const emailId = parts[2]  // moemail 的 email_id 作为 password 存储
      items.push({
        id: email,
        secure_c_ses: '',
        csesidx: '',
        config_id: '',
        mail_provider: 'moemail',
        mail_address: email,
        mail_password: emailId,
      })
      return
    }

    if (parts[0].toLowerCase() === 'freemail') {
      if (parts.length < 2 || !parts[1]) {
        errors.push(`第 ${lineNo} 行格式错误（freemail）`)
        return
      }
      const email = parts[1]

      // 完整格式：freemail----email----base_url----jwt_token----verify_ssl----domain
      if (parts.length >= 6) {
        items.push({
          id: email,
          secure_c_ses: '',
          csesidx: '',
          config_id: '',
          mail_provider: 'freemail',
          mail_address: email,
          mail_password: '',
          mail_base_url: parts[2] || undefined,
          mail_jwt_token: parts[3] || undefined,
          mail_verify_ssl: parts[4] === 'true' || parts[4] === '1',
          mail_domain: parts[5] || undefined,
        })
        return
      }

      // 简化格式：freemail----email
      items.push({
        id: email,
        secure_c_ses: '',
        csesidx: '',
        config_id: '',
        mail_provider: 'freemail',
        mail_address: email,
        mail_password: '',
      })
      return
    }

    if (parts[0].toLowerCase() === 'gptmail') {
      if (parts.length < 2 || !parts[1]) {
        errors.push(`第 ${lineNo} 行格式错误（gptmail）`)
        return
      }
      const email = parts[1]
      items.push({
        id: email,
        secure_c_ses: '',
        csesidx: '',
        config_id: '',
        mail_provider: 'gptmail',
        mail_address: email,
        mail_password: '',
      })
      return
    }

    if (parts[0].toLowerCase() === 'cfmail') {
      if (parts.length < 2 || !parts[1]) {
        errors.push(`第 ${lineNo} 行格式错误（cfmail）`)
        return
      }
      const email = parts[1]
      const jwt = parts[2] || ''
      items.push({
        id: email,
        secure_c_ses: '',
        csesidx: '',
        config_id: '',
        mail_provider: 'cfmail',
        mail_address: email,
        mail_password: jwt,
      })
      return
    }

    if (parts.length >= 4 && parts[0] && parts[2] && parts[3]) {
      const email = parts[0]
      const password = parts[1] || ''
      const clientId = parts[2]
      const refreshToken = parts.slice(3).join('----')
      items.push({
        id: email,
        secure_c_ses: '',
        csesidx: '',
        config_id: '',
        mail_provider: 'microsoft',
        mail_address: email,
        mail_password: password,
        mail_client_id: clientId,
        mail_refresh_token: refreshToken,
        mail_tenant: 'consumers',
      })
      return
    }

    if (parts.length === 1 && parts[0]) {
      const apiKey = parts[0]
      items.push({
        id: `exa_${lineNo}`,
        secure_c_ses: '',
        csesidx: '',
        config_id: '',
        exa_api_key: apiKey,
      })
      return
    }

    errors.push(`第 ${lineNo} 行格式错误`)
  })

  return { items, errors }
}

const CONFIG_EXPORT_FIELDS = [
  'id',
  'secure_c_ses',
  'host_c_oses',
  'csesidx',
  'config_id',
  'exa_api_key',
  'coupon_code',
  'coupon_status',
  'balance',
  'expires_at',
  'disabled',
  'trial_end',
  'mail_provider',
  'mail_address',
  'mail_password',
  'mail_client_id',
  'mail_refresh_token',
  'mail_tenant',
  'mail_base_url',
  'mail_jwt_token',
  'mail_verify_ssl',
  'mail_domain',
  'mail_api_key',
]

const normalizeConfigItem = (item: Record<string, unknown>) => {
  const next: Record<string, unknown> = {}
  CONFIG_EXPORT_FIELDS.forEach((key) => {
    if (key in item) {
      next[key] = item[key]
    }
  })
  return next
}

const normalizeConfigList = (list: Record<string, unknown>[]) =>
  list.map((item) => normalizeConfigItem(item))

const validateConfigItems = (list: Record<string, unknown>[]) => {
  const errors: string[] = []
  list.forEach((item, index) => {
    const lineNo = index + 1
    const exaKey = String(item.exa_api_key || '').trim()
    if (exaKey) return
    const mailProvider = String(item.mail_provider || '').trim()
    const mailAddress = String(item.mail_address || '').trim()
    if (mailProvider && mailAddress) return
    const missing: string[] = []
    if (!String(item.secure_c_ses || '').trim()) missing.push('secure_c_ses')
    if (!String(item.csesidx || '').trim()) missing.push('csesidx')
    if (!String(item.config_id || '').trim()) missing.push('config_id')
    if (missing.length) {
      errors.push(`第 ${lineNo} 条缺少必需字段：${missing.join(', ')}`)
    }
  })
  return { ok: errors.length === 0, errors }
}

const triggerImportFile = () => {
  importFileInput.value?.click()
}

const handleImportFile = async (event: Event) => {
  const target = event.target as HTMLInputElement
  const files = Array.from(target.files || [])
  if (!files.length) return
  importError.value = ''
  importFileName.value = files.length === 1 ? files[0].name : `${files[0].name} (+${files.length - 1})`

  try {
    // 多文件导入：支持一次选择多个 JSON 文件（每个文件为数组或 { accounts: [...] }）
    const isAllJson = files.every((f) => f.name.toLowerCase().endsWith('.json') || f.type.includes('json'))
    if (isAllJson) {
      const allItems: Record<string, unknown>[] = []
      for (const file of files) {
        const content = await file.text()
        const parsed = JSON.parse(content)
        const importList = Array.isArray(parsed) ? parsed : (parsed as any)?.accounts
        if (!Array.isArray(importList)) {
          importError.value = `JSON 格式错误：${file.name} 需要数组或包含 accounts 字段`
          return
        }
        allItems.push(...importList)
      }

      const normalizedList = normalizeConfigList(allItems)
      const validation = validateConfigItems(normalizedList)
      if (!validation.ok) {
        importError.value = validation.errors.slice(0, 3).join('，')
        return
      }
      const existing = await loadConfigList()
      const next = [...existing]
      const indexMap = new Map(next.map((acc, idx) => [acc.id, idx]))
      const importedIds: string[] = []

      normalizedList.forEach((item: any) => {
        const idx = indexMap.get(item.id || '')
        if (idx === undefined) {
          next.push(item)
        } else {
          next[idx] = { ...next[idx], ...item }
        }
        if (item.id) importedIds.push(item.id)
      })

      await accountsStore.updateConfig(next)
      selectedIds.value = new Set(importedIds)
      toast.success(`导入 ${allItems.length} 条账号配置（${files.length} 个文件）`)

      closeRegisterModal()
      return
    }

    // TXT 导入：一次只支持选 1 个文件（保持原行为）
    if (files.length === 1) {
      const file = files[0]
      const content = await file.text()
      importText.value = content
      await handleImport()
      return
    }

    importError.value = '仅支持一次选择多个 JSON 文件；TXT 导入请一次选择一个文件'
  } catch (error: any) {
    importError.value = error.message || '文件解析失败'
  } finally {
    target.value = ''
  }
}

const handleImport = async () => {
  importError.value = ''
  if (!importText.value.trim()) {
    importError.value = '请输入导入内容'
    return
  }
  const { items, errors } = parseImportLines(importText.value)
  if (!items.length) {
    importError.value = errors.length ? errors.join('，') : '未识别到有效账号'
    return
  }
  if (errors.length) {
    importError.value = errors.slice(0, 3).join('，')
    return
  }

  isImporting.value = true
  try {
    const list = await loadConfigList()
    const next = [...list]
    const indexMap = new Map(next.map((acc, idx) => [acc.id, idx]))
    const importedIds: string[] = []

    items.forEach((item) => {
      const idx = indexMap.get(item.id || '')
      if (idx === undefined) {
        next.push(item)
        importedIds.push(item.id)
        return
      }

      const existing = next[idx]
      const updated: AccountConfigItem = { ...existing }
      if (item.mail_provider) {
        updated.mail_provider = item.mail_provider
        updated.mail_address = item.mail_address
        if (item.mail_provider === 'microsoft') {
          updated.mail_client_id = item.mail_client_id
          updated.mail_refresh_token = item.mail_refresh_token
          updated.mail_tenant = item.mail_tenant
          updated.mail_password = item.mail_password
        } else {
          updated.mail_password = item.mail_password
          updated.mail_client_id = undefined
          updated.mail_refresh_token = undefined
          updated.mail_tenant = undefined
        }
      }
      if (item.exa_api_key) {
        updated.exa_api_key = item.exa_api_key
      }

      next[idx] = updated
      importedIds.push(item.id)
    })

    await accountsStore.updateConfig(next)
    await refreshAccounts()

    selectedIds.value = new Set(importedIds)
    toast.success(`成功导入 ${importedIds.length} 个账户`)
    closeRegisterModal()

  } catch (error: any) {
    importError.value = error.message || '导入失败'
    toast.error(error.message || '导入失败')
  } finally {
    isImporting.value = false
  }
}

const exportConfig = async (format: 'json' | 'txt', scope: 'all' | 'selected' = 'all') => {
  try {
    const response = await accountsApi.getConfig()
    let list = Array.isArray(response.accounts) ? response.accounts : []
    if (scope === 'selected') {
      const selected = selectedIds.value
      list = list.filter((item) => selected.has(item.id))
    }
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')

    if (format === 'json') {
      const payload = JSON.stringify(normalizeConfigList(list as unknown as Record<string, unknown>[]), null, 2)
      downloadText(payload, `accounts-${timestamp}.json`, 'application/json')
      toast.success('导出 JSON 成功')
      return
    }

    const lines = list.map((item) => {
      const provider = (item.mail_provider || '').toLowerCase()
      const email = item.mail_address || item.id || ''
      if (!email) return ''
      if (provider === 'moemail') {
        return `moemail----${email}----${item.mail_password || ''}`
      }
      if (provider === 'freemail') {
        return `freemail----${email}`
      }
      if (provider === 'gptmail') {
        return `gptmail----${email}`
      }
      if (provider === 'cfmail') {
        return `cfmail----${email}----${item.mail_password || ''}`
      }
      if (provider === 'duckmail') {
        return `duckmail----${email}----${item.mail_password || ''}`
      }
      if (provider === 'microsoft' || item.mail_client_id || item.mail_refresh_token) {
        return `${email}----${item.mail_password || ''}----${item.mail_client_id || ''}----${item.mail_refresh_token || ''}`
      }
      if (item.mail_password) {
        return `duckmail----${email}----${item.mail_password}`
      }
      return email
    }).filter(Boolean)

    downloadText(lines.join('\n'), `accounts-${timestamp}.txt`, 'text/plain')
    toast.success('导出 TXT 成功')
  } catch (error: any) {
    toast.error(error.message || '导出失败')
  }
}

const runExport = async () => {
  await exportConfig(exportFormat.value, exportScope.value)
  closeExportModal()
}

const downloadText = (content: string, filename: string, mime: string) => {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}


const toggleMoreActions = () => {
  showMoreActions.value = !showMoreActions.value
}

const closeMoreActions = () => {
  showMoreActions.value = false
}

const handleMoreActionsClick = (event: MouseEvent) => {
  if (!showMoreActions.value) return
  const target = event.target as Node
  if (moreActionsRef.value && !moreActionsRef.value.contains(target)) {
    showMoreActions.value = false
  }
}

onMounted(async () => {
  await refreshAccounts()
  document.addEventListener('click', handleMoreActionsClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleMoreActionsClick)
})

const statusLabel = (account: AdminAccount) => {
  if (account.disabled) {
    if (account.disabled_reason?.includes('403')) {
      return '403 禁用'
    }
    return '手动禁用'
  }
  return '正常'
}

const statusClass = (account: AdminAccount) => {
  const status = statusLabel(account)
  if (status === '手动禁用') {
    return 'bg-muted text-muted-foreground'
  }
  if (status === '403 禁用') {
    return 'bg-rose-600 text-white'
  }
  return 'bg-emerald-500 text-white'
}

const shouldShowEnable = (account: AdminAccount) => {
  return account.disabled
}

const displayApiKey = (value: string | null | undefined) => value || '未设置'

const trialBadgeClass = (days: number | null | undefined) => {
  if (days == null) return ''
  if (days > 7) return 'bg-emerald-500 text-white'
  if (days >= 3) return 'bg-amber-500 text-white'
  return 'bg-rose-500 text-white'
}

const rowClass = (account: AdminAccount) => {
  const status = statusLabel(account)
  if (status === '手动禁用' || status === '403 禁用') {
    return 'bg-muted/70'
  }
  return ''
}

const toggleSelect = (accountId: string) => {
  const next = new Set(selectedIds.value)
  if (next.has(accountId)) {
    next.delete(accountId)
  } else {
    next.add(accountId)
  }
  selectedIds.value = next
}

const toggleSelectAll = () => {
  if (allSelected.value) {
    selectedIds.value = new Set()
    return
  }
  selectedIds.value = new Set(filteredAccounts.value.map(account => account.id))
}

const getConfigId = (acc: AccountConfigItem, index: number) =>
  acc.id || `account_${index + 1}`

const loadConfigList = async () => {
  const response = await accountsApi.getConfig()
  return response.accounts.map((acc, index) => ({
    ...acc,
    id: getConfigId(acc, index),
  }))
}

const formatLogLine = (log: { time: string; level: string; message: string }) =>
  `${log.time} [${log.level}] ${log.message}`

const applyEditTarget = (list: AccountConfigItem[], accountId: string) => {
  let targetIndex = -1
  for (let i = 0; i < list.length; i += 1) {
    if (list[i].id === accountId) {
      targetIndex = i
      break
    }
  }
  if (targetIndex === -1) {
    editError.value = '未找到对应账号配置。'
    return false
  }

  const target = list[targetIndex]
  editForm.value = {
    id: target.id,
    secure_c_ses: target.secure_c_ses,
    csesidx: target.csesidx,
    config_id: target.config_id,
    host_c_oses: target.host_c_oses,
    exa_api_key: target.exa_api_key,
  }
  configAccounts.value = list
  editIndex.value = targetIndex
  isEditOpen.value = true
  return true
}

const openEdit = async (accountId: string) => {
  editError.value = ''
  try {
    const list = await loadConfigList()
    applyEditTarget(list, accountId)
  } catch (error: any) {
    editError.value = error.message || '加载账号配置失败'
  }
}

const openConfigPanel = async () => {
  configError.value = ''
  try {
    const response = await accountsApi.getConfig()
    configData.value = Array.isArray(response.accounts) ? response.accounts : []
    configJson.value = JSON.stringify(maskConfig(configData.value), null, 2)
    configMasked.value = true
    isConfigOpen.value = true
  } catch (error: any) {
    configError.value = error.message || '加载账号配置失败'
  }
}

const closeConfigPanel = () => {
  isConfigOpen.value = false
  configError.value = ''
  configMasked.value = false
}

const getConfigFromEditor = () => {
  const parsed = JSON.parse(configJson.value)
  if (!Array.isArray(parsed)) {
    throw new Error('配置格式必须是数组。')
  }
  return parsed as AccountConfigItem[]
}

const maskValue = (value: unknown) => {
  if (typeof value !== 'string') return value
  if (!value) return value
  if (value.length <= 6) return `${value.slice(0, 2)}****`
  return `${value.slice(0, 3)}****`
}

const maskConfig = (list: AccountConfigItem[]) => {
  const fields = new Set([
    'secure_c_ses',
    'csesidx',
    'config_id',
    'host_c_oses',
    'exa_api_key',
    'mail_password',
    'mail_refresh_token',
    'mail_client_id',
    'mail_api_key',
  ])
  return list.map((item) => {
    const next = { ...item }
    fields.forEach((field) => {
      const value = (next as Record<string, unknown>)[field]
      if (value) {
        ;(next as Record<string, unknown>)[field] = maskValue(value)
      }
    })
    return next
  })
}

const toggleConfigMask = () => {
  configError.value = ''
  if (!configMasked.value) {
    try {
      configData.value = getConfigFromEditor()
    } catch (error: any) {
      configError.value = error.message || 'JSON 格式错误'
      return
    }
    configJson.value = JSON.stringify(maskConfig(configData.value), null, 2)
    configMasked.value = true
    return
  }

  configJson.value = JSON.stringify(configData.value, null, 2)
  configMasked.value = false
}

const saveConfigPanel = async () => {
  configError.value = ''
  try {
    const parsed = getConfigFromEditor()
    await accountsStore.updateConfig(parsed)
    toast.success('配置保存成功')
    closeConfigPanel()
  } catch (error: any) {
    configError.value = error.message || '保存失败'
    toast.error(error.message || '保存失败')
  }
}

const closeEdit = () => {
  isEditOpen.value = false
  editError.value = ''
}

const saveEdit = async () => {
  if (editIndex.value === null) return
  const next = [...configAccounts.value]
  next[editIndex.value] = {
    ...next[editIndex.value],
    id: editForm.value.id,
    secure_c_ses: editForm.value.secure_c_ses,
    csesidx: editForm.value.csesidx,
    config_id: editForm.value.config_id,
    host_c_oses: editForm.value.host_c_oses || undefined,
    exa_api_key: editForm.value.exa_api_key || undefined,
  }

  try {
    await accountsStore.updateConfig(next)
    toast.success('账号编辑成功')
    closeEdit()
  } catch (error: any) {
    editError.value = error.message || '保存失败'
    toast.error(error.message || '保存失败')
  }
}

const formatOpErrors = (errors: string[]) => {
  if (!errors.length) return ''
  const sample = errors[0]
  return `失败 ${errors.length} 个${sample ? `，示例：${sample}` : ''}`
}

const handleOpResult = (result: { ok: boolean; errors: string[] }, successMessage: string, failMessage: string) => {
  if (result.ok) {
    toast.success(successMessage)
    return true
  }
  const detail = formatOpErrors(result.errors)
  toast.error(detail ? `${failMessage}（${detail}）` : failMessage)
  return false
}

const handleBulkEnable = async () => {
  if (isOperating.value) return
  try {
    const result = await accountsStore.bulkEnable(Array.from(selectedIds.value))
    if (handleOpResult(result, '批量启用成功', '批量启用失败')) {
      selectedIds.value = new Set()
    }
  } catch (error: any) {
    toast.error(error.message || '批量启用失败')
  }
}

const handleBulkDisable = async () => {
  const confirmed = await confirmDialog.ask({
    title: '批量禁用',
    message: '确定要批量禁用选中的账号吗？',
  })
  if (!confirmed) return
  if (isOperating.value) return
  try {
    const result = await accountsStore.bulkDisable(Array.from(selectedIds.value))
    if (handleOpResult(result, '批量禁用成功', '批量禁用失败')) {
      selectedIds.value = new Set()
    }
  } catch (error: any) {
    toast.error(error.message || '批量禁用失败')
  }
}

const handleBulkDelete = async () => {
  if (isOperating.value) return
  const confirmed = await confirmDialog.ask({
    title: '批量删除',
    message: '确定要批量删除选中的账号吗？',
    confirmText: '删除',
  })
  if (!confirmed) return
  try {
    const result = await accountsStore.bulkDelete(Array.from(selectedIds.value))
    if (handleOpResult(result, '批量删除成功', '批量删除失败')) {
      selectedIds.value = new Set()
    }
  } catch (error: any) {
    toast.error(error.message || '批量删除失败')
  }
}

const handleEnable = async (accountId: string) => {
  if (isOperating.value) return
  try {
    const result = await accountsStore.enableAccount(accountId)
    handleOpResult(result, '账号已启用', '启用失败')
  } catch (error: any) {
    toast.error(error.message || '启用失败')
  }
}

const handleDisable = async (accountId: string) => {
  if (isOperating.value) return
  const confirmed = await confirmDialog.ask({
    title: '禁用账号',
    message: '确定要禁用该账号吗？',
  })
  if (!confirmed) return
  try {
    const result = await accountsStore.disableAccount(accountId)
    handleOpResult(result, '账号已禁用', '禁用失败')
  } catch (error: any) {
    toast.error(error.message || '禁用失败')
  }
}

const handleDelete = async (accountId: string) => {
  if (isOperating.value) return
  const confirmed = await confirmDialog.ask({
    title: '删除账号',
    message: '确定要删除该账号吗？',
    confirmText: '删除',
  })
  if (!confirmed) return
  try {
    const result = await accountsStore.deleteAccount(accountId)
    handleOpResult(result, '账号已删除', '删除失败')
  } catch (error: any) {
    toast.error(error.message || '删除失败')
  }
}

const getTaskResultType = (
  status: string,
  success: number,
  fail: number,
  total?: number,
) => {
  if (status === 'pending' || status === 'running' || status === 'cancelled') return status
  const s = Number.isFinite(success) ? success : 0
  const f = Number.isFinite(fail) ? fail : 0
  const t = Number.isFinite(total) ? total : s + f
  if (s > 0 && f > 0) return 'partial'
  if (s > 0 && f === 0) return 'success'
  if (f > 0 && s === 0) return 'failed'
  if (t === 0) return 'none'
  return 'none'
}

const formatTaskStatus = (task: any) => {
  const status = task?.status || ''
  const success = task?.success_count ?? 0
  const fail = task?.fail_count ?? 0
  const total = Number.isFinite(task?.total) ? task.total : undefined
  const result = getTaskResultType(status, success, fail, total)
  if (result === 'pending') return '等待中'
  if (result === 'running') return '执行中'
  if (result === 'cancelled') return '已中断'
  if (result === 'success') return '已完成（全部成功）'
  if (result === 'failed') return '已完成（全部失败）'
  if (result === 'partial') return '已完成（部分失败）'
  return '已完成'
}

</script>

