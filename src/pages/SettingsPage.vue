<script setup>
import { ref, onMounted } from 'vue'
import { readDatabaseInfo } from '../services/database'
import { persistenceState } from '../services/persistence'
import '../css/task-components.css'
import '../css/task-list.css'
import '../css/persistence.css'

// Додаткове завдання 5: значення отримуємо безпосередньо з IndexedDB,
// а не з Pinia, щоб побачити саме те, що записано в базу.
const info = ref(null)
const error = ref('')
const loading = ref(false)

async function load() {
  loading.value = true
  error.value = ''
  try {
    info.value = await readDatabaseInfo()
  } catch (e) {
    error.value = `Не вдалося прочитати IndexedDB: ${e.message}`
  } finally {
    loading.value = false
  }
}

function formatValue(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)
    ? new Date(value).toLocaleString('uk-UA')
    : String(value)
}

onMounted(load)
</script>

<template>
  <f7-page name="settings" class="tf3-page">
    <f7-navbar title="Налаштування" back-link="Назад" />

    <div class="tf3-container">
      <section class="tf3-hero">
        <div class="tf3-eyebrow">TASKFLOW / SETTINGS</div>
        <h1>Локальна база даних</h1>
        <p>Дані прочитано безпосередньо з IndexedDB цього браузера.</p>
        <button type="button" class="tf5-btn tf5-btn--primary tf5-new" @click="load">
          {{ loading ? 'Оновлення…' : 'Оновити дані' }}
        </button>
      </section>

      <p v-if="error" class="tf5-error" role="alert">{{ error }}</p>

      <template v-if="info">
        <div class="tf7-info-grid">
          <div class="tf7-info"><span>База даних</span><strong>{{ info.name }}</strong></div>
          <div class="tf7-info"><span>Версія схеми</span><strong>{{ info.version }}</strong></div>
          <div class="tf7-info"><span>Збережено завдань</span><strong>{{ info.taskCount }}</strong></div>
          <div class="tf7-info"><span>Збережено проєктів</span><strong>{{ info.projectCount }}</strong></div>
          <div class="tf7-info"><span>Стан збереження</span><strong>{{ persistenceState.status }}</strong></div>
        </div>

        <section class="tf5-panel">
          <h2>Object stores: {{ info.stores.join(', ') }}</h2>

          <h3 class="tf7-subtitle">metadata</h3>
          <div class="tf7-table-wrap">
            <table class="tf7-table">
              <thead><tr><th>Ключ</th><th>Значення</th></tr></thead>
              <tbody>
                <tr v-for="(value, key) in info.metadata" :key="key">
                  <td>{{ key }}</td><td>{{ formatValue(value) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 class="tf7-subtitle">projects (keyPath: id)</h3>
          <div class="tf7-table-wrap">
            <table class="tf7-table">
              <thead><tr><th>id</th><th>title</th></tr></thead>
              <tbody>
                <tr v-for="project in info.projects" :key="project.id">
                  <td>{{ project.id }}</td><td>{{ project.title }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h3 class="tf7-subtitle">tasks (keyPath: id)</h3>
          <div class="tf7-table-wrap">
            <table class="tf7-table">
              <thead><tr><th>id</th><th>title</th><th>status</th><th>priority</th><th>dueDate</th><th>projectId</th></tr></thead>
              <tbody>
                <tr v-for="task in info.tasks" :key="task.id">
                  <td>{{ task.id }}</td><td>{{ task.title }}</td><td>{{ task.status }}</td>
                  <td>{{ task.priority }}</td><td>{{ task.dueDate || '—' }}</td><td>{{ task.projectId }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </template>
    </div>
  </f7-page>
</template>

<style scoped>
.tf7-subtitle { margin: 18px 0 4px; color: #ffffff; font-size: 15px; }
</style>
