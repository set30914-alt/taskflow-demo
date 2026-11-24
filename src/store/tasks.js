import { defineStore } from 'pinia'
import initialTasks from '../data/tasks'
import { useProjectsStore } from './projects'

const allowedStatuses = ['todo', 'progress', 'done']
const allowedPriorities = ['low', 'medium', 'high']
const allowedCategories = ['study', 'work', 'personal']
const priorityRank = { high: 3, medium: 2, low: 1 }
const statusRank = { progress: 0, todo: 1, done: 2 }

function isValidDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = new Date(`${value}T12:00:00`)
  return !Number.isNaN(date.getTime()) &&
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` === value
}

function normalizeValues(values, projects) {
  const requestedProject = String(values.projectId ?? 'general')
  const projectId = projects.some((project) => project.id === requestedProject)
    ? requestedProject
    : 'general'

  return {
    title: String(values.title ?? '').trim(),
    description: String(values.description ?? '').trim(),
    status: allowedStatuses.includes(values.status) ? values.status : 'todo',
    priority: allowedPriorities.includes(values.priority) ? values.priority : 'medium',
    dueDate: String(values.dueDate ?? ''),
    category: allowedCategories.includes(values.category) ? values.category : 'study',
    projectId,
  }
}

function isValidTask(values) {
  return values.title.length >= 3 && values.title.length <= 80 &&
    values.description.length <= 300 &&
    (!values.dueDate || isValidDate(values.dueDate))
}

export const useTasksStore = defineStore('tasks', {
  state: () => ({
    // Старі записи без projectId належать проєкту «Загальні».
    tasks: initialTasks.map((task) => ({
      category: 'study',
      ...task,
      projectId: task.projectId ?? 'general',
    })),
    searchText: '',
    selectedStatus: 'all',
    selectedPriority: 'all',
    selectedProject: 'all',
    sortOrder: 'newest',
    onlyActive: false,
    onlyNoDueDate: false, // додаткове завдання 5
  }),

  getters: {
    totalTasks: (state) => state.tasks.length,
    completedTasks: (state) => state.tasks.filter((task) => task.status === 'done').length,
    progressTasks: (state) => state.tasks.filter((task) => task.status === 'progress').length,
    todoTasks: (state) => state.tasks.filter((task) => task.status === 'todo').length,
    completionPercent() {
      return this.totalTasks ? Math.round((this.completedTasks / this.totalTasks) * 100) : 0
    },
    activeTasks: (state) => state.tasks
      .filter((task) => task.status !== 'done')
      .sort((a, b) => priorityRank[b.priority] - priorityRank[a.priority] || b.id - a.id)
      .slice(0, 3),

    visibleTasks: (state) => {
      const term = state.searchText.trim().toLocaleLowerCase('uk-UA')

      const filtered = state.tasks.filter((task) => {
        const text = `${task.title} ${task.description ?? ''}`.toLocaleLowerCase('uk-UA')
        return (!term || text.includes(term)) &&
          (state.selectedStatus === 'all' || task.status === state.selectedStatus) &&
          (state.selectedPriority === 'all' || task.priority === state.selectedPriority) &&
          (state.selectedProject === 'all' || task.projectId === state.selectedProject) &&
          (!state.onlyActive || task.status !== 'done') &&
          (!state.onlyNoDueDate || !task.dueDate)
      })

      // sort() застосовуємо до нового масиву, а не до state.tasks.
      return filtered.sort((a, b) => {
        switch (state.sortOrder) {
          case 'title':
            return a.title.localeCompare(b.title, 'uk-UA') || a.id - b.id
          case 'priority':
            return priorityRank[b.priority] - priorityRank[a.priority] || b.id - a.id
          case 'dueDate':
            return (a.dueDate || '9999-12-31').localeCompare(b.dueDate || '9999-12-31') || b.id - a.id
          case 'dueDateDesc':
            if (!a.dueDate && !b.dueDate) return b.id - a.id
            if (!a.dueDate) return 1
            if (!b.dueDate) return -1
            return b.dueDate.localeCompare(a.dueDate) || b.id - a.id
          case 'status':
            return statusRank[a.status] - statusRank[b.status] || b.id - a.id
          default:
            return b.id - a.id
        }
      })
    },

    visibleDonePercent() {
      const list = this.visibleTasks
      if (!list.length) return 0
      return Math.round((list.filter((task) => task.status === 'done').length / list.length) * 100)
    },

    isTitleTaken: (state) => (title, exceptId = null) => {
      const normalized = String(title).trim().toLocaleLowerCase('uk-UA')
      return state.tasks.some((task) => task.id !== exceptId &&
        task.title.trim().toLocaleLowerCase('uk-UA') === normalized)
    },
  },

  actions: {
    addTask(values) {
      const projectStore = useProjectsStore()
      const normalized = normalizeValues(values, projectStore.projects)
      if (!isValidTask(normalized) || this.isTitleTaken(normalized.title)) return null

      const nextId = Math.max(0, ...this.tasks.map((task) => task.id)) + 1
      const task = { id: nextId, ...normalized }
      this.tasks.unshift(task)
      return task
    },

    updateTask(values) {
      const task = this.tasks.find((item) => item.id === Number(values.id))
      if (!task) return null

      const projectStore = useProjectsStore()
      const normalized = normalizeValues(values, projectStore.projects)
      if (!isValidTask(normalized) || this.isTitleTaken(normalized.title, task.id)) return null

      Object.assign(task, normalized)
      return task
    },

    deleteTask(id) {
      const index = this.tasks.findIndex((task) => task.id === Number(id))
      if (index === -1) return false
      this.tasks.splice(index, 1)
      return true
    },

    setTaskStatus({ id, status }) {
      if (!allowedStatuses.includes(status)) return false
      const task = this.tasks.find((item) => item.id === Number(id))
      if (!task) return false
      task.status = status
      return true
    },

    setTaskPriority({ id, priority }) {
      if (!allowedPriorities.includes(priority)) return false
      const task = this.tasks.find((item) => item.id === Number(id))
      if (!task) return false
      task.priority = priority
      return true
    },

    // Додаткове завдання 4: групове переведення завдань проєкту в роботу
    startProjectTasks(projectId) {
      let changed = 0
      this.tasks.forEach((task) => {
        if (task.projectId === projectId && task.status !== 'progress') {
          task.status = 'progress'
          changed += 1
        }
      })
      return changed
    },

    resetFilters() {
      this.searchText = ''
      this.selectedStatus = 'all'
      this.selectedPriority = 'all'
      this.selectedProject = 'all'
      this.sortOrder = 'newest'
      this.onlyActive = false
      this.onlyNoDueDate = false
    },
  },
})
