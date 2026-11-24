<script setup>
import { computed, nextTick, ref } from 'vue'
import AppTabbar from '../components/AppTabbar.vue'
import TaskCard from '../components/TaskCard.vue'
import TaskForm from '../components/TaskForm.vue'
import {
  taskState,
  addTask,
  updateTask,
  setTaskStatus,
  setTaskPriority,
} from '../store/tasks'
import '../css/task-components.css'
import '../css/task-form.css'

const selectedStatus = ref('all')
const selectedPriority = ref('all')
const sortMode = ref('default')
const searchQuery = ref('') // додаткове завдання 6
const formVisible = ref(false)
const editingId = ref(null)
const formAnchor = ref(null)
const feedback = ref('')
const selectedTask = ref(null)

const statusOptions = [
  { value: 'all', label: 'Усі' },
  { value: 'todo', label: 'Заплановано' },
  { value: 'progress', label: 'У роботі' },
  { value: 'done', label: 'Виконано' },
]
const priorityOptions = [
  { value: 'all', label: 'Усі' },
  { value: 'low', label: 'Низький' },
  { value: 'medium', label: 'Середній' },
  { value: 'high', label: 'Високий' },
]
const sortOptions = [
  { value: 'default', label: 'Без сортування' },
  { value: 'priority-desc', label: 'Спочатку високий' },
  { value: 'priority-asc', label: 'Спочатку низький' },
]
const priorityWeight = { high: 3, medium: 2, low: 1 }

const filteredTasks = computed(() => {
  const query = searchQuery.value.trim().toLocaleLowerCase('uk-UA')
  const list = taskState.tasks.filter((task) => (
    (selectedStatus.value === 'all' || task.status === selectedStatus.value) &&
    (selectedPriority.value === 'all' || task.priority === selectedPriority.value) &&
    (!query || task.title.toLocaleLowerCase('uk-UA').includes(query))
  ))
  if (sortMode.value === 'default') return list
  const dir = sortMode.value === 'priority-desc' ? -1 : 1
  return [...list].sort((a, b) => dir * (priorityWeight[a.priority] - priorityWeight[b.priority]))
})

const editingTask = computed(() => (
  taskState.tasks.find((task) => task.id === editingId.value) ?? null
))

function handleStatusChange(payload) { setTaskStatus(payload) }
function handlePriorityChange(payload) { setTaskPriority(payload) }
function handleTaskSelect(payload) {
  selectedTask.value = selectedTask.value?.id === payload.id ? null : payload
}

async function scrollToForm() {
  await nextTick()
  formAnchor.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function createTask() {
  editingId.value = null
  formVisible.value = true
  feedback.value = ''
  await scrollToForm()
}

async function editTask(id) {
  editingId.value = id
  formVisible.value = true
  feedback.value = ''
  await scrollToForm()
}

function cancelForm() {
  formVisible.value = false
  editingId.value = null
}

function saveTask(data) {
  const isEditing = editingId.value !== null
  const saved = isEditing
    ? updateTask({ id: editingId.value, ...data })
    : addTask(data)

  if (!saved) {
    feedback.value = 'Не вдалося зберегти завдання. Перевірте дані форми.'
    return
  }

  feedback.value = isEditing
    ? `Завдання «${saved.title}» оновлено.`
    : `Завдання «${saved.title}» створено.`
  cancelForm()
  selectedStatus.value = 'all'
  selectedPriority.value = 'all'
  searchQuery.value = ''
}
</script>

<template>
  <f7-page name="tasks" class="tf3-page">
    <f7-navbar title="Мої завдання" />

    <div class="tf3-container">
      <section class="tf3-hero">
        <div class="tf3-eyebrow">TASKFLOW / TASK MANAGER</div>
        <h1>Мої завдання</h1>
        <p>Керуйте завданнями, статусами та пріоритетами.</p>
        <button type="button" class="tf4-new-task" @click="createTask">
          + Додати завдання
        </button>
      </section>

      <p v-if="feedback" class="tf4-feedback" role="status">{{ feedback }}</p>

      <section v-if="formVisible" ref="formAnchor" class="tf4-form-section">
        <TaskForm :key="editingId ?? 'new'" :task="editingTask"
                  @save="saveTask" @cancel="cancelForm" />
      </section>

      <section class="tf3-filters">
        <div class="tf4-search">
          <label class="tf3-filter-title" for="tf4-search">Пошук за назвою</label>
          <input id="tf4-search" v-model="searchQuery" type="search"
                 placeholder="Почніть вводити назву завдання…" />
        </div>
        <div class="tf3-filter-group">
          <div class="tf3-filter-title">Фільтр за статусом</div>
          <div class="tf3-filter-buttons">
            <button v-for="option in statusOptions" :key="option.value"
                    type="button" class="tf3-filter-button"
                    :class="{ 'is-active': selectedStatus === option.value }"
                    :aria-pressed="selectedStatus === option.value"
                    @click="selectedStatus = option.value">{{ option.label }}</button>
          </div>
        </div>
        <div class="tf3-filter-group">
          <div class="tf3-filter-title">Фільтр за пріоритетом</div>
          <div class="tf3-filter-buttons">
            <button v-for="option in priorityOptions" :key="option.value"
                    type="button" class="tf3-filter-button"
                    :class="{ 'is-active': selectedPriority === option.value }"
                    :aria-pressed="selectedPriority === option.value"
                    @click="selectedPriority = option.value">{{ option.label }}</button>
          </div>
        </div>
        <div class="tf3-filter-group">
          <div class="tf3-filter-title">Сортування за пріоритетом</div>
          <div class="tf3-filter-buttons">
            <button v-for="option in sortOptions" :key="option.value"
                    type="button" class="tf3-filter-button"
                    :class="{ 'is-active': sortMode === option.value }"
                    :aria-pressed="sortMode === option.value"
                    @click="sortMode = option.value">{{ option.label }}</button>
          </div>
        </div>
      </section>

      <section class="tf3-section">
        <div class="tf3-section-heading">
          <div>
            <div class="tf3-eyebrow">TASK LIST</div>
            <h2>Список завдань</h2>
          </div>
          <div class="tf3-counter">Знайдено: {{ filteredTasks.length }}</div>
        </div>

        <div v-if="selectedTask" class="tf3-selected">
          Обрано завдання: <b>{{ selectedTask.title }}</b>
        </div>

        <div v-if="filteredTasks.length" class="tf3-task-grid">
          <TaskCard v-for="task in filteredTasks" :key="task.id"
                    :task="task" :editable="true"
                    :selected="selectedTask?.id === task.id"
                    @status-change="handleStatusChange"
                    @priority-change="handlePriorityChange"
                    @task-select="handleTaskSelect"
                    @edit="editTask" />
        </div>
        <div v-else class="tf3-empty">
          За обраними фільтрами завдань не знайдено.
        </div>
      </section>
    </div>

    <template #fixed>
      <AppTabbar active="tasks" />
    </template>
  </f7-page>
</template>
