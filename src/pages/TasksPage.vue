<script setup>
import { ref, computed, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import { f7 } from 'framework7-vue/bundle'
import AppTabbar from '../components/AppTabbar.vue'
import TaskCard from '../components/TaskCard.vue'
import TaskForm from '../components/TaskForm.vue'
import TaskListControls from '../components/TaskListControls.vue'
import { useTasksStore } from '../store/tasks'
import { useProjectsStore } from '../store/projects'
import {
  persistenceState,
  retrySave,
  downloadExport,
  validateImport,
  applyImport,
} from '../services/persistence'
import '../css/task-components.css'
import '../css/task-form.css'
import '../css/task-list.css'
import '../css/persistence.css'

const taskStore = useTasksStore()
const projectStore = useProjectsStore()

// Для деструктуризації реактивного стану й getters використовуємо storeToRefs().
const {
  tasks,
  visibleTasks,
  visibleDonePercent,
  searchText,
  selectedStatus,
  selectedPriority,
  selectedProject,
  sortOrder,
  onlyActive,
  onlyNoDueDate,
} = storeToRefs(taskStore)
const { projects, projectStats } = storeToRefs(projectStore)

// Стан відкриття форми та поле нового проєкту – локальні: іншим сторінкам вони не потрібні.
const showForm = ref(false)
const editingId = ref(null)
const formAnchor = ref(null)
const feedback = ref('')
const newProjectTitle = ref('')
const newProjectError = ref('')

const editingTask = computed(() =>
  tasks.value.find((task) => task.id === editingId.value) ?? null,
)
// Повідомлення про стан локального збереження
const saveMessage = computed(() => {
  if (persistenceState.status === 'loading') return 'Завантаження локальних даних…'
  if (persistenceState.status === 'saving') return 'Збереження змін у IndexedDB…'
  if (persistenceState.status === 'saved') return 'Усі зміни збережено в цьому браузері.'
  return persistenceState.error || 'Помилка локального збереження.'
})

// Додаткове завдання 4: дата й час останнього успішного збереження
const lastSavedText = computed(() => (persistenceState.lastSavedAt
  ? new Intl.DateTimeFormat('uk-UA', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).format(persistenceState.lastSavedAt)
  : '—'))

// Додаткове завдання 1: експорт JSON
function exportJson() {
  const data = downloadExport()
  feedback.value = `Експортовано: завдань – ${data.tasks.length}, проєктів – ${data.projects.length}.`
}

// Додаткове завдання 2: імпорт JSON з перевіркою та підтвердженням
const importInput = ref(null)
function chooseImport() {
  importInput.value?.click()
}
async function onImportFile(event) {
  const file = event.target.files?.[0]
  event.target.value = ''
  if (!file) return
  let raw
  try {
    raw = JSON.parse(await file.text())
  } catch {
    feedback.value = 'Імпорт скасовано: файл не є коректним JSON.'
    return
  }
  const result = validateImport(raw)
  if (!result.ok) {
    feedback.value = `Імпорт скасовано: ${result.errors.join(' ')}`
    return
  }
  confirmDialog('Імпорт даних',
    `Замінити поточні дані (${tasks.value.length} завдань, ${projects.value.length} проєктів) `
    + `даними з файлу (${result.tasks.length} завдань, ${result.projects.length} проєктів)?`,
    'Імпортувати', () => {
      applyImport(result)
      taskStore.resetFilters()
      feedback.value = `Імпортовано: завдань – ${result.tasks.length}, проєктів – ${result.projects.length}.`
    })
}

const activeProjectTitle = computed(() =>
  selectedProject.value === 'all' ? '' : projectStore.projectTitle(selectedProject.value),
)

async function scrollToForm() {
  await nextTick()
  formAnchor.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function startCreate() {
  editingId.value = null
  showForm.value = true
  feedback.value = ''
  await scrollToForm()
}

async function startEdit(id) {
  editingId.value = id
  showForm.value = true
  feedback.value = ''
  await scrollToForm()
}

function cancelForm() {
  editingId.value = null
  showForm.value = false
}

function saveTask(values) {
  const isEditing = editingId.value !== null
  const saved = isEditing
    ? taskStore.updateTask({ id: editingId.value, ...values })
    : taskStore.addTask(values)

  if (!saved) {
    feedback.value = 'Не вдалося зберегти завдання. Перевірте дані форми.'
    return
  }
  feedback.value = isEditing
    ? `Завдання «${saved.title}» оновлено.`
    : `Завдання «${saved.title}» створено.`
  cancelForm()
}

function confirmDialog(title, text, okText, onOk) {
  f7.dialog.create({
    title,
    text,
    buttons: [
      { text: 'Скасувати' },
      { text: okText, color: 'red', bold: true, onClick: onOk },
    ],
  }).open()
}

function handleDelete(id) {
  const task = tasks.value.find((item) => item.id === Number(id))
  if (!task) return
  confirmDialog('Видалення завдання', `Видалити завдання «${task.title}»?`, 'Видалити', () => {
    if (taskStore.deleteTask(id)) {
      feedback.value = `Завдання «${task.title}» видалено.`
      if (editingId.value === id) cancelForm()
    }
  })
}

function createProject() {
  const project = projectStore.addProject(newProjectTitle.value)
  if (!project) {
    newProjectError.value = 'Назва: 3–40 символів. Не повторюйте назви проєктів.'
    return
  }
  newProjectTitle.value = ''
  newProjectError.value = ''
  selectedProject.value = project.id
  feedback.value = `Проєкт «${project.title}» створено та обрано у фільтрі.`
}

// Додаткове завдання 4: групове переведення завдань проєкту «У роботі»
function startWholeProject() {
  const id = selectedProject.value
  if (id === 'all') return
  const title = projectStore.projectTitle(id)
  confirmDialog('Групова зміна статусу',
    `Перевести всі завдання проєкту «${title}» у статус «У роботі»?`, 'Перевести', () => {
      const changed = taskStore.startProjectTasks(id)
      feedback.value = `Проєкт «${title}»: у роботу переведено завдань – ${changed}.`
    })
}
</script>

<template>
  <f7-page name="tasks" class="tf3-page">
    <f7-navbar title="Мої завдання" />

    <div class="tf3-container">
      <section class="tf3-hero">
        <div class="tf3-eyebrow">TASKFLOW / TASK MANAGER</div>
        <h1>Керування завданнями і проєктами</h1>
        <p>Pinia керує станом, IndexedDB зберігає завдання та проєкти локально.</p>
        <button type="button" class="tf5-btn tf5-btn--primary tf5-new" @click="startCreate">
          + Додати завдання
        </button>
      </section>

      <section
        class="tf7-persistence"
        :class="`tf7-persistence--${persistenceState.status}`"
        role="status"
        aria-live="polite"
      >
        <strong>Локальне збереження</strong>
        <span>{{ saveMessage }}</span>
        <small>Останнє збереження: {{ lastSavedText }}</small>
        <button v-if="persistenceState.canRetry" type="button" class="tf5-btn" @click="retrySave">
          Повторити збереження
        </button>
      </section>

      <p v-if="persistenceState.remoteUpdate" class="tf7-remote">{{ persistenceState.remoteUpdate }}</p>

      <div class="tf7-data-tools">
        <button type="button" class="tf5-btn" @click="exportJson">Експорт JSON</button>
        <button type="button" class="tf5-btn" @click="chooseImport">Імпорт JSON</button>
        <input ref="importInput" type="file" accept="application/json,.json" @change="onImportFile" />
      </div>

      <p v-if="feedback" class="tf4-feedback" role="status">{{ feedback }}</p>

      <section class="tf5-panel tf6-project-panel" aria-label="Проєкти">
        <h2>Мої проєкти</h2>
        <div class="tf6-project-list">
          <button v-for="project in projectStats" :key="project.id" type="button"
                  class="tf6-project-pill" :class="{ 'is-active': selectedProject === project.id }"
                  @click="selectedProject = selectedProject === project.id ? 'all' : project.id">
            {{ project.title }} <strong>{{ project.taskCount }}</strong>
            <span class="tf6-pill-percent">{{ project.donePercent }}%</span>
          </button>
        </div>
        <form class="tf6-project-form" @submit.prevent="createProject">
          <label>
            Назва нового проєкту
            <input
              v-model="newProjectTitle"
              type="text"
              maxlength="40"
              placeholder="Наприклад: Лабораторні"
              @input="newProjectError = ''"
            />
          </label>
          <button type="submit" class="tf5-btn tf5-btn--primary">Створити проєкт</button>
        </form>
        <p v-if="newProjectError" class="tf5-error" role="alert">{{ newProjectError }}</p>

        <div v-if="activeProjectTitle" class="tf6-bulk">
          <span>Обрано проєкт: <b>{{ activeProjectTitle }}</b></span>
          <button type="button" class="tf5-btn" @click="startWholeProject">
            Усі завдання проєкту → «У роботі»
          </button>
        </div>
      </section>

      <section v-if="showForm" ref="formAnchor" class="tf4-form-section">
        <TaskForm
          :key="editingId ?? 'new'"
          :task="editingTask"
          :projects="projects"
          @save="saveTask"
          @cancel="cancelForm"
        />
      </section>

      <TaskListControls
        v-model:search="searchText"
        v-model:status="selectedStatus"
        v-model:priority="selectedPriority"
        v-model:project="selectedProject"
        v-model:sort="sortOrder"
        v-model:onlyActive="onlyActive"
        v-model:onlyNoDueDate="onlyNoDueDate"
        :projects="projects"
        @reset="taskStore.resetFilters"
      />

      <section class="tf3-section">
        <div class="tf3-section-heading">
          <div>
            <div class="tf3-eyebrow">TASK LIST</div>
            <h2>Список завдань</h2>
          </div>
          <div class="tf5-counters">
            <div class="tf3-counter">Показано: {{ visibleTasks.length }} із {{ tasks.length }}</div>
            <div class="tf3-counter tf5-percent">Виконано: {{ visibleDonePercent }}%</div>
          </div>
        </div>

        <div v-if="visibleTasks.length" class="tf3-task-grid">
          <TaskCard
            v-for="task in visibleTasks"
            :key="task.id"
            :task="task"
            :project-title="projectStore.projectTitle(task.projectId)"
            :editable="true"
            @status-change="taskStore.setTaskStatus"
            @priority-change="taskStore.setTaskPriority"
            @edit="startEdit"
            @delete="handleDelete"
          />
        </div>
        <div v-else-if="!tasks.length" class="tf5-empty">
          <p><b>Список завдань порожній.</b></p>
          <p>Усі завдання видалено. Створіть нове або оновіть сторінку.</p>
          <button type="button" class="tf5-btn tf5-btn--primary" @click="startCreate">+ Додати завдання</button>
        </div>
        <div v-else class="tf5-empty">
          <p>За поточними умовами завдань не знайдено.</p>
          <button type="button" class="tf5-btn" @click="taskStore.resetFilters">
            Показати всі завдання
          </button>
        </div>
      </section>
    </div>

    <template #fixed>
      <AppTabbar active="tasks" />
    </template>
  </f7-page>
</template>
