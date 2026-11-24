<script setup>
import { storeToRefs } from 'pinia'
import AppTabbar from '../components/AppTabbar.vue'
import TaskCard from '../components/TaskCard.vue'
import TaskCounter from '../components/TaskCounter.vue'
import { useTasksStore } from '../store/tasks'
import { useProjectsStore } from '../store/projects'
import '../css/task-components.css'
import '../css/task-list.css'

const taskStore = useTasksStore()
const projectStore = useProjectsStore()
const {
  totalTasks, completedTasks, progressTasks, todoTasks, completionPercent, activeTasks,
} = storeToRefs(taskStore)
const { projectCount, projectStats } = storeToRefs(projectStore)

function projectTitleFor(task) {
  return projectStore.projectTitle(task.projectId)
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
        <p>Контролюйте виконання завдань і пріоритети. Проєктів: {{ projectCount }}.</p>
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

      <!-- Додаткові завдання 2 і 3: проєкти з невиконаними завданнями та відсотком -->
      <section class="tf3-section">
        <div class="tf3-section-heading">
          <div>
            <div class="tf3-eyebrow">PROJECTS</div>
            <h2>Проєкти</h2>
          </div>
        </div>
        <div class="tf6-home-projects">
          <div v-for="project in projectStats" :key="project.id" class="tf6-home-project">
            <div class="tf6-home-project-title">{{ project.title }}</div>
            <div class="tf6-home-project-meta">
              Невиконаних: <b>{{ project.openCount }}</b> із {{ project.taskCount }}
            </div>
            <div class="tf3-progress-track tf6-mini-track">
              <div class="tf3-progress-fill" :style="{ width: project.donePercent + '%' }"></div>
            </div>
            <div class="tf6-home-project-percent">{{ project.donePercent }}% виконано</div>
          </div>
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
        <div v-if="activeTasks.length" class="tf3-task-grid">
          <TaskCard
            v-for="task in activeTasks"
            :key="task.id"
            :task="task"
            :project-title="projectTitleFor(task)"
            @status-change="taskStore.setTaskStatus"
            @priority-change="taskStore.setTaskPriority"
          />
        </div>
        <div v-else class="tf5-empty">Наразі всі завдання виконані.</div>
      </section>
    </div>

    <template #fixed>
      <AppTabbar active="home" />
    </template>
  </f7-page>
</template>
