import { reactive } from 'vue'
import initialTasks from '../data/tasks'

// Єдине реактивне сховище для HomePage і TasksPage.
// Pinia та IndexedDB будемо використовувати в наступних роботах.
const allowedStatuses = ['todo', 'progress', 'done']
const allowedPriorities = ['low', 'medium', 'high']
export const allowedCategories = ['study', 'work', 'personal']

export const taskState = reactive({
  tasks: initialTasks.map((task) => ({ category: 'study', ...task })),
})

function findTask(id) {
  return taskState.tasks.find((task) => task.id === Number(id))
}

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }
  const date = new Date(`${value}T12:00:00`)
  return !Number.isNaN(date.getTime()) &&
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}` === value
}

export function isTitleTaken(title, exceptId = null) {
  const normalized = String(title).trim().toLocaleLowerCase('uk-UA')
  return taskState.tasks.some((task) => task.id !== exceptId &&
    task.title.trim().toLocaleLowerCase('uk-UA') === normalized)
}

function normalizeTaskData(data) {
  if (!data || typeof data !== 'object') return null

  const title = typeof data.title === 'string' ? data.title.trim() : ''
  const description = typeof data.description === 'string' ? data.description.trim() : ''

  if (title.length < 3 || title.length > 80) return null
  if (description.length > 300) return null
  if (!allowedStatuses.includes(data.status)) return null
  if (!allowedPriorities.includes(data.priority)) return null
  if (!validDate(data.dueDate)) return null

  return {
    title,
    description,
    status: data.status,
    priority: data.priority,
    dueDate: data.dueDate,
    category: allowedCategories.includes(data.category) ? data.category : 'study',
  }
}

export function addTask(data) {
  const normalized = normalizeTaskData(data)
  if (!normalized) return null
  if (isTitleTaken(normalized.title)) return null

  const nextId = Math.max(0, ...taskState.tasks.map((task) => task.id)) + 1
  const newTask = { id: nextId, ...normalized }
  taskState.tasks.unshift(newTask)
  return newTask
}

export function updateTask({ id, ...data }) {
  const task = findTask(id)
  if (!task) return null

  const normalized = normalizeTaskData(data)
  if (!normalized) return null

  Object.assign(task, normalized)
  return task
}

export function setTaskStatus({ id, status }) {
  if (!allowedStatuses.includes(status)) return false
  const task = findTask(id)
  if (!task) return false
  task.status = status
  return true
}

export function setTaskPriority({ id, priority }) {
  if (!allowedPriorities.includes(priority)) return false
  const task = findTask(id)
  if (!task) return false
  task.priority = priority
  return true
}

export function deleteTask(id) {
  const index = taskState.tasks.findIndex((task) => task.id === Number(id))
  if (index === -1) return false
  taskState.tasks.splice(index, 1)
  return true
}
