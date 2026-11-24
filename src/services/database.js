import { openDB } from 'idb'

const DB_NAME = 'taskflow-db'
const DB_VERSION = 1
let databasePromise = null

// Відкриваємо одну базу даних і повторно використовуємо з'єднання.
export function getDatabase() {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('Цей браузер не підтримує IndexedDB.'))
  }

  if (!databasePromise) {
    databasePromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('tasks')) {
          db.createObjectStore('tasks', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('projects')) {
          db.createObjectStore('projects', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata')
        }
      },
    }).catch((error) => {
      databasePromise = null
      throw error
    })
  }

  return databasePromise
}

// Читаємо завдання, проєкти та службові значення в одній транзакції.
export async function readSnapshot() {
  const db = await getDatabase()
  const tx = db.transaction(['tasks', 'projects', 'metadata'], 'readonly')
  const [tasks, projects, initialized, nextProjectId, lastSavedAt] = await Promise.all([
    tx.objectStore('tasks').getAll(),
    tx.objectStore('projects').getAll(),
    tx.objectStore('metadata').get('initialized'),
    tx.objectStore('metadata').get('nextProjectId'),
    tx.objectStore('metadata').get('lastSavedAt'),
  ])
  await tx.done

  return { tasks, projects, initialized: initialized === true, nextProjectId, lastSavedAt }
}

// Атомарно замінюємо збережені списки актуальним знімком Pinia.
// Додаткове завдання 4: разом зі знімком записуємо час lastSavedAt.
export async function writeSnapshot(snapshot) {
  const db = await getDatabase()
  const tx = db.transaction(['tasks', 'projects', 'metadata'], 'readwrite')
  const taskStore = tx.objectStore('tasks')
  const projectStore = tx.objectStore('projects')
  const metadataStore = tx.objectStore('metadata')
  const savedAt = new Date().toISOString()

  await Promise.all([taskStore.clear(), projectStore.clear()])
  await Promise.all([
    ...snapshot.tasks.map((task) => taskStore.put(task)),
    ...snapshot.projects.map((project) => projectStore.put(project)),
    metadataStore.put(true, 'initialized'),
    metadataStore.put(snapshot.nextProjectId, 'nextProjectId'),
    metadataStore.put(savedAt, 'lastSavedAt'),
    tx.done,
  ])
  return savedAt
}

// Додаткове завдання 3: точкове видалення одного запису методом delete().
// На відміну від повного знімка, змінює лише один ключ і не переписує інші записи.
export async function deleteTaskRecord(id) {
  const db = await getDatabase()
  const tx = db.transaction(['tasks', 'metadata'], 'readwrite')
  await Promise.all([
    tx.objectStore('tasks').delete(Number(id)),
    tx.objectStore('metadata').put(new Date().toISOString(), 'lastSavedAt'),
    tx.done,
  ])
}

// Додаткове завдання 5: службова інформація безпосередньо з IndexedDB.
export async function readDatabaseInfo() {
  const db = await getDatabase()
  const tx = db.transaction(['tasks', 'projects', 'metadata'], 'readonly')
  const metaStore = tx.objectStore('metadata')
  const [taskCount, projectCount, tasks, projects, metaKeys, metaValues] = await Promise.all([
    tx.objectStore('tasks').count(),
    tx.objectStore('projects').count(),
    tx.objectStore('tasks').getAll(),
    tx.objectStore('projects').getAll(),
    metaStore.getAllKeys(),
    metaStore.getAll(),
  ])
  await tx.done

  return {
    name: db.name,
    version: db.version,
    stores: [...db.objectStoreNames],
    taskCount,
    projectCount,
    tasks,
    projects,
    metadata: Object.fromEntries(metaKeys.map((key, index) => [key, metaValues[index]])),
  }
}
