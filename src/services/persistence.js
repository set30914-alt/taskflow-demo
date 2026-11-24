import { reactive } from 'vue'
import { useTasksStore } from '../store/tasks'
import { useProjectsStore } from '../store/projects'
import { readSnapshot, writeSnapshot } from './database'

export const persistenceState = reactive({
  status: 'loading', // loading | saving | saved | error
  error: '',
  canRetry: false,
  lastSavedAt: null,
  remoteUpdate: '', // повідомлення про зміни з іншої вкладки
})

let taskStore = null
let projectStore = null
let enabled = false
let writing = false
let revision = 0
let savedRevision = 0
let lastRequestedSnapshot = ''
let scheduled = false
let channel = null

// JSON-серіалізація перетворює реактивні об'єкти Pinia на звичайні дані.
function makeSnapshot() {
  return JSON.parse(JSON.stringify({
    tasks: taskStore.tasks,
    projects: projectStore.projects,
    nextProjectId: projectStore.nextProjectId,
  }))
}

function calculateNextProjectId(projects, storedValue) {
  const calculated = Math.max(
    0,
    ...projects.map((project) => {
      const match = /^project-(\d+)$/.exec(String(project.id))
      return match ? Number(match[1]) : 0
    }),
  ) + 1
  return Number.isSafeInteger(storedValue) && storedValue >= calculated ? storedValue : calculated
}

// Відновлюємо state двох сховищ без зайвого запису у базу.
function applySnapshot(snapshot) {
  const nextProjectId = calculateNextProjectId(snapshot.projects, snapshot.nextProjectId)
  lastRequestedSnapshot = JSON.stringify({
    tasks: snapshot.tasks,
    projects: snapshot.projects,
    nextProjectId,
  })
  projectStore.$patch({ projects: snapshot.projects, nextProjectId })
  taskStore.$patch({ tasks: snapshot.tasks })
}

// В один момент часу виконуємо не більш як один запис в IndexedDB.
async function flushChanges() {
  if (!enabled || writing) return
  writing = true

  try {
    while (savedRevision < revision) {
      const targetRevision = revision
      const snapshot = makeSnapshot()

      try {
        const savedAt = await writeSnapshot(snapshot)
        savedRevision = targetRevision
        persistenceState.lastSavedAt = new Date(savedAt)
        // Додаткове завдання 6: повідомляємо інші вкладки про новий знімок.
        channel?.postMessage({ type: 'saved', savedAt })
      } catch (error) {
        console.error('TaskFlow: збереження не вдалося:', error)
        persistenceState.status = 'error'
        persistenceState.error = 'Зміни поки що залишилися лише в пам’яті.'
        persistenceState.canRetry = true
        return
      }
    }

    persistenceState.status = 'saved'
    persistenceState.error = ''
    persistenceState.canRetry = false
  } finally {
    writing = false
  }
}

function requestSave(force = false) {
  if (!enabled) return
  const fingerprint = JSON.stringify(makeSnapshot())
  if (!force && fingerprint === lastRequestedSnapshot) return
  lastRequestedSnapshot = fingerprint
  revision += 1
  persistenceState.status = 'saving'
  persistenceState.error = ''
  persistenceState.canRetry = false
  void flushChanges()
}

// Об'єднуємо синхронні зміни й не записуємо зміни лише у фільтрах.
function onStoreChanged() {
  if (scheduled) return
  scheduled = true
  queueMicrotask(() => {
    scheduled = false
    requestSave()
  })
}

// Кнопка повторної спроби використовується тільки після помилки запису.
export function retrySave() {
  if (!enabled || persistenceState.status !== 'error') return
  requestSave(true)
}

// Додаткове завдання 6: інша вкладка зберегла дані – перечитуємо базу.
async function onRemoteSaved() {
  if (!enabled || writing || savedRevision < revision) return
  try {
    const snapshot = await readSnapshot()
    applySnapshot(snapshot)
    persistenceState.lastSavedAt = snapshot.lastSavedAt ? new Date(snapshot.lastSavedAt) : null
    persistenceState.remoteUpdate = `Дані оновлено з іншої вкладки о ${new Date().toLocaleTimeString('uk-UA')}.`
  } catch (error) {
    console.error('TaskFlow: не вдалося синхронізувати вкладки:', error)
  }
}

export async function initializePersistence(pinia) {
  taskStore = useTasksStore(pinia)
  projectStore = useProjectsStore(pinia)

  try {
    const snapshot = await readSnapshot()

    if (snapshot.initialized) {
      if (!Array.isArray(snapshot.tasks) || !Array.isArray(snapshot.projects)) {
        throw new Error('Некоректний формат локальних даних.')
      }
      applySnapshot(snapshot)
      persistenceState.lastSavedAt = snapshot.lastSavedAt ? new Date(snapshot.lastSavedAt) : null
    } else {
      // Демонстраційні дані записуємо тільки під час першого запуску.
      const savedAt = await writeSnapshot(makeSnapshot())
      persistenceState.lastSavedAt = new Date(savedAt)
      lastRequestedSnapshot = JSON.stringify(makeSnapshot())
    }

    persistenceState.status = 'saved'
    enabled = true

    // Слухаємо зміни стану обох сховищ; фільтри не записуємо.
    taskStore.$subscribe(onStoreChanged, { detached: true, flush: 'sync' })
    projectStore.$subscribe(onStoreChanged, { detached: true, flush: 'sync' })

    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel('taskflow-sync')
      channel.onmessage = (event) => {
        if (event.data?.type === 'saved') void onRemoteSaved()
      }
    }
  } catch (error) {
    console.error('TaskFlow: IndexedDB недоступна:', error)
    persistenceState.status = 'error'
    persistenceState.error = 'Не вдалося відкрити або відновити локальні дані. '
      + 'Працює лише тимчасовий стан; наявну базу не перезаписано.'
    persistenceState.canRetry = false
  }
}

// ---------- Додаткові завдання 1–2: експорт та імпорт JSON ----------

export function buildExport() {
  const data = makeSnapshot()
  return {
    app: 'TaskFlow',
    format: 1,
    exportedAt: new Date().toISOString(),
    tasks: data.tasks,
    projects: data.projects,
  }
}

export function downloadExport() {
  const data = buildExport()
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `taskflow-export-${data.exportedAt.slice(0, 10)}.json`
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return data
}

const STATUSES = ['todo', 'progress', 'done']
const PRIORITIES = ['low', 'medium', 'high']

// Перевіряє структуру, типи полів, projectId та унікальність id.
export function validateImport(raw) {
  const errors = []
  if (!raw || typeof raw !== 'object') return { ok: false, errors: ['Файл не містить JSON-об’єкта.'] }
  if (!Array.isArray(raw.tasks)) errors.push('Відсутній масив tasks.')
  if (!Array.isArray(raw.projects)) errors.push('Відсутній масив projects.')
  if (errors.length) return { ok: false, errors }

  const projectIds = new Set()
  raw.projects.forEach((project, index) => {
    if (typeof project?.id !== 'string' || !project.id) errors.push(`projects[${index}]: id має бути непорожнім рядком.`)
    else if (projectIds.has(project.id)) errors.push(`projects[${index}]: повторюваний id «${project.id}».`)
    else projectIds.add(project.id)
    if (typeof project?.title !== 'string' || project.title.trim().length < 3) errors.push(`projects[${index}]: некоректна назва.`)
  })

  const taskIds = new Set()
  raw.tasks.forEach((task, index) => {
    if (!Number.isInteger(task?.id) || task.id < 1) errors.push(`tasks[${index}]: id має бути цілим числом.`)
    else if (taskIds.has(task.id)) errors.push(`tasks[${index}]: повторюваний id ${task.id}.`)
    else taskIds.add(task.id)
    if (typeof task?.title !== 'string' || task.title.trim().length < 3) errors.push(`tasks[${index}]: некоректна назва.`)
    if (!STATUSES.includes(task?.status)) errors.push(`tasks[${index}]: невідомий статус.`)
    if (!PRIORITIES.includes(task?.priority)) errors.push(`tasks[${index}]: невідомий пріоритет.`)
    if (typeof task?.projectId !== 'string') errors.push(`tasks[${index}]: відсутній projectId.`)
    else if (!projectIds.has(task.projectId)) errors.push(`tasks[${index}]: проєкт «${task.projectId}» не існує.`)
    if (task?.dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(task.dueDate)) errors.push(`tasks[${index}]: некоректна дата.`)
  })

  return { ok: errors.length === 0, errors: errors.slice(0, 5), tasks: raw.tasks, projects: raw.projects }
}

// Застосовує перевірений імпорт; запис у IndexedDB виконає підписка $subscribe.
export function applyImport(result) {
  projectStore.$patch({
    projects: result.projects,
    nextProjectId: calculateNextProjectId(result.projects, projectStore.nextProjectId),
  })
  taskStore.$patch({ tasks: result.tasks })
}
