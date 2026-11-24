<script setup>
import { computed } from 'vue'
import StatusBadge from './StatusBadge.vue'
import PriorityBadge from './PriorityBadge.vue'

const props = defineProps({
  task: { type: Object, required: true },
  projectTitle: { type: String, default: 'Загальні' },
  // editable вмикає кнопки «Редагувати» та «Видалити» (сторінка «Мої завдання»)
  editable: { type: Boolean, default: false },
  selected: { type: Boolean, default: false },
})
const emit = defineEmits([
  'status-change',
  'priority-change',
  'edit',
  'delete',
  'task-select',
])

const statusSequence = ['todo', 'progress', 'done']
const prioritySequence = ['low', 'medium', 'high']
const categoryLabels = { study: 'Навчання', work: 'Робота', personal: 'Особисте' }

const statusActionText = computed(() => ({
  todo: 'Взяти в роботу',
  progress: 'Завершити',
  done: 'Повернути в план',
})[props.task.status] || 'Змінити статус')

const formattedDate = computed(() => {
  if (!props.task.dueDate) return 'Без терміну'
  const date = new Date(`${props.task.dueDate}T12:00:00`)
  if (Number.isNaN(date.getTime())) return 'Дата не визначена'
  return new Intl.DateTimeFormat('uk-UA', {
    day: '2-digit', month: 'long', year: 'numeric',
  }).format(date)
})

function changeStatus() {
  const currentIndex = statusSequence.indexOf(props.task.status)
  emit('status-change', {
    id: props.task.id,
    status: statusSequence[(currentIndex + 1) % statusSequence.length],
  })
}

function changePriority() {
  const currentIndex = prioritySequence.indexOf(props.task.priority)
  emit('priority-change', {
    id: props.task.id,
    priority: prioritySequence[(currentIndex + 1) % prioritySequence.length],
  })
}

function selectTask() {
  emit('task-select', { id: props.task.id, title: props.task.title })
}
</script>

<template>
  <f7-card class="tf3-task-card" :class="{ 'is-selected': selected }">
    <f7-card-content>
      <div class="tf3-card-heading">
        <h3 class="tf3-card-title">
          <button type="button" class="tf3-title-button" @click="selectTask">{{ task.title }}</button>
        </h3>
        <StatusBadge :status="task.status" />
      </div>

      <p class="tf3-card-description">{{ task.description || 'Без опису' }}</p>

      <div class="tf3-card-meta">
        <div class="tf3-meta-item">
          <span class="tf3-meta-label">Пріоритет:</span>
          <PriorityBadge :priority="task.priority" />
          <span v-if="task.category" class="tf3-badge tf4-category">{{ categoryLabels[task.category] }}</span>
        </div>
        <div class="tf3-meta-date">Термін: {{ formattedDate }}</div>
        <div class="tf3-meta-date tf6-card-project">Проєкт: <b>{{ projectTitle }}</b></div>
      </div>

      <div class="tf3-card-actions tf5-card-actions">
        <button type="button" class="tf3-action tf3-action--primary" @click="changeStatus">
          {{ statusActionText }}
        </button>
        <button type="button" class="tf3-action" @click="changePriority">
          {{ editable ? 'Пріоритет' : 'Змінити пріоритет' }}
        </button>
        <template v-if="editable">
          <button type="button" class="tf3-action" @click="emit('edit', task.id)">
            Редагувати
          </button>
          <button type="button" class="tf3-action tf5-danger" @click="emit('delete', task.id)">
            Видалити
          </button>
        </template>
      </div>
    </f7-card-content>
  </f7-card>
</template>
