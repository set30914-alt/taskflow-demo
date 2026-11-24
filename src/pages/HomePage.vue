<script setup>
import { ref, computed } from 'vue'
import AppTabbar from '../components/AppTabbar.vue'
import TaskCard from '../components/TaskCard.vue'
import TaskCounter from '../components/TaskCounter.vue'
import { taskState, setTaskStatus, setTaskPriority } from '../store/tasks'
import '../css/task-components.css'

const countBy = (status) => taskState.tasks.filter((task) => task.status === status).length

const totalTasks = computed(() => taskState.tasks.length)
const completedTasks = computed(() => countBy('done'))
const progressTasks = computed(() => countBy('progress'))
const todoTasks = computed(() => countBy('todo')) // додаткове завдання 2

// Додаткове завдання 4: відсоток виконаних завдань
const completionPercent = computed(() => (totalTasks.value
  ? Math.round((completedTasks.value / totalTasks.value) * 100) : 0))

const activeTasks = computed(() => {
  const order = { high: 0, medium: 1, low: 2 }
  return taskState.tasks.filter((task) => task.status !== 'done')
    .sort((a, b) => order[a.priority] - order[b.priority]).slice(0, 3)
})

function handleStatusChange(payload) { setTaskStatus(payload) }
function handlePriorityChange(payload) { setTaskPriority(payload) }

// Додаткове завдання 5: обробка події task-select
const selectedTask = ref(null)
function handleTaskSelect(payload) {
  selectedTask.value = selectedTask.value?.id === payload.id ? null : payload
}
</script>

<template>
  <f7-page name="home" class="tf3-page">
    <f7-navbar title="TaskFlow">
      <f7-nav-right><f7-link href="/about/">Про застосунок</f7-link></f7-nav-right>
    </f7-navbar>

    <div class="tf3-container">
      <section class="tf3-hero">
        <div class="tf3-eyebrow">TASKFLOW / DASHBOARD</div>
        <h1>Панель керування</h1>
        <p>Контролюйте виконання завдань та їхні пріоритети.</p>
      </section>

      <section class="tf3-stat-grid">
        <TaskCounter label="Усього завдань" :value="totalTasks" />
        <TaskCounter label="Заплановано" :value="todoTasks" variant="todo" />
        <TaskCounter label="У роботі" :value="progressTasks" variant="progress" />
        <TaskCounter label="Виконано" :value="completedTasks" variant="done" />
      </section>

      <section class="tf3-progress" aria-label="Відсоток виконаних завдань">
        <div class="tf3-progress-head">
          <span>Виконано завдань</span>
          <strong>{{ completionPercent }}%</strong>
        </div>
        <div class="tf3-progress-track">
          <div class="tf3-progress-fill" :style="{ width: completionPercent + '%' }"></div>
        </div>
      </section>

      <section class="tf3-section">
        <div class="tf3-section-heading">
          <div>
            <div class="tf3-eyebrow">PRIORITY TASKS</div>
            <h2>Актуальні завдання</h2>
          </div>
          <f7-button href="/tasks/" outline small>Переглянути всі</f7-button>
        </div>

        <div v-if="selectedTask" class="tf3-selected">
          Обрано завдання: <b>{{ selectedTask.title }}</b>
        </div>

        <div v-if="activeTasks.length" class="tf3-task-grid">
          <TaskCard v-for="task in activeTasks" :key="task.id" :task="task"
                    :selected="selectedTask?.id === task.id"
                    @status-change="handleStatusChange"
                    @priority-change="handlePriorityChange"
                    @task-select="handleTaskSelect" />
        </div>
        <div v-else class="tf3-empty">Наразі всі завдання виконані.</div>
      </section>
    </div>

    <template #fixed>
      <AppTabbar active="home" />
    </template>
  </f7-page>
</template>
