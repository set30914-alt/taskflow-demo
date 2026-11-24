<script setup>
import { ref, computed } from 'vue'
import AppTabbar from '../components/AppTabbar.vue'
import TaskCard from '../components/TaskCard.vue'
import { taskState, setTaskStatus, setTaskPriority } from '../store/tasks'
import '../css/task-components.css'

const selectedStatus = ref('all')
const selectedPriority = ref('all')
const sortMode = ref('default') // додаткове завдання 6

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
  const list = taskState.tasks.filter((task) => (
    (selectedStatus.value === 'all' || task.status === selectedStatus.value) &&
    (selectedPriority.value === 'all' || task.priority === selectedPriority.value)
  ))
  if (sortMode.value === 'default') return list
  const dir = sortMode.value === 'priority-desc' ? -1 : 1
  return [...list].sort((a, b) => dir * (priorityWeight[a.priority] - priorityWeight[b.priority]))
})

function handleStatusChange(payload) { setTaskStatus(payload) }
function handlePriorityChange(payload) { setTaskPriority(payload) }

const selectedTask = ref(null)
function handleTaskSelect(payload) {
  selectedTask.value = selectedTask.value?.id === payload.id ? null : payload
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
      </section>

      <section class="tf3-filters">
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
          <div><div class="tf3-eyebrow">TASK LIST</div><h2>Список завдань</h2></div>
          <div class="tf3-counter">Знайдено: {{ filteredTasks.length }}</div>
        </div>

        <div v-if="selectedTask" class="tf3-selected">
          Обрано завдання: <b>{{ selectedTask.title }}</b>
        </div>

        <div v-if="filteredTasks.length" class="tf3-task-grid">
          <TaskCard v-for="task in filteredTasks" :key="task.id" :task="task"
                    :selected="selectedTask?.id === task.id"
                    @status-change="handleStatusChange"
                    @priority-change="handlePriorityChange"
                    @task-select="handleTaskSelect" />
        </div>
        <div v-else class="tf3-empty">За обраними фільтрами завдань не знайдено.</div>
      </section>
    </div>

    <template #fixed>
      <AppTabbar active="tasks" />
    </template>
  </f7-page>
</template>
