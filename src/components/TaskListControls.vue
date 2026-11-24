<script setup>
defineProps({
  search: { type: String, default: '' },
  status: { type: String, default: 'all' },
  priority: { type: String, default: 'all' },
  project: { type: String, default: 'all' },
  sort: { type: String, default: 'newest' },
  onlyActive: { type: Boolean, default: false },
  onlyNoDueDate: { type: Boolean, default: false },
  projects: { type: Array, required: true },
})

const emit = defineEmits([
  'update:search',
  'update:status',
  'update:priority',
  'update:project',
  'update:sort',
  'update:onlyActive',
  'update:onlyNoDueDate',
  'reset',
])
</script>

<template>
  <section class="tf5-panel" aria-label="Пошук і фільтри">
    <h2>Пошук і впорядкування</h2>

    <div class="tf5-controls-grid">
      <label class="tf5-search">
        Пошук за назвою та описом
        <span class="tf5-search-row">
          <input
            type="search"
            :value="search"
            placeholder="Наприклад: інтерфейс"
            @input="emit('update:search', $event.target.value)"
          />
          <!-- Додаткове завдання 4: кнопка видна лише при непорожньому пошуку -->
          <button v-if="search" type="button" class="tf5-btn tf5-clear"
                  @click="emit('update:search', '')">Очистити пошук</button>
        </span>
      </label>

      <label>
        Статус
        <select :value="status" @change="emit('update:status', $event.target.value)">
          <option value="all">Усі статуси</option>
          <option value="todo">Заплановано</option>
          <option value="progress">У роботі</option>
          <option value="done">Виконано</option>
        </select>
      </label>

      <label>
        Пріоритет
        <select :value="priority" @change="emit('update:priority', $event.target.value)">
          <option value="all">Усі пріоритети</option>
          <option value="low">Низький</option>
          <option value="medium">Середній</option>
          <option value="high">Високий</option>
        </select>
      </label>

      <label>
        Проєкт
        <select :value="project" @change="emit('update:project', $event.target.value)">
          <option value="all">Усі проєкти</option>
          <option v-for="item in projects" :key="item.id" :value="item.id">
            {{ item.title }}
          </option>
        </select>
      </label>

      <label>
        Сортування
        <select :value="sort" @change="emit('update:sort', $event.target.value)">
          <option value="newest">Спочатку нові</option>
          <option value="title">За назвою (А–Я)</option>
          <option value="priority">За пріоритетом (високий перший)</option>
          <option value="dueDate">За терміном (найближчий перший)</option>
          <option value="dueDateDesc">За терміном (найпізніший перший)</option>
          <option value="status">За статусом (у роботі → заплановано → виконано)</option>
        </select>
      </label>

      <!-- Додаткове завдання 1: швидкий фільтр -->
      <div class="tf5-quick">
        <span>Швидкий фільтр</span>
        <button type="button" class="tf5-btn tf5-toggle"
                :class="{ 'is-on': onlyActive }" :aria-pressed="onlyActive"
                @click="emit('update:onlyActive', !onlyActive)">
          Тільки невиконані
        </button>
      </div>

      <!-- Додаткове завдання 5: фільтр у Pinia state -->
      <div class="tf5-quick">
        <span>Термін</span>
        <button type="button" class="tf5-btn tf5-toggle"
                :class="{ 'is-on': onlyNoDueDate }" :aria-pressed="onlyNoDueDate"
                @click="emit('update:onlyNoDueDate', !onlyNoDueDate)">
          Лише без терміну
        </button>
      </div>
    </div>

    <button type="button" class="tf5-btn tf5-reset" @click="emit('reset')">
      Скинути фільтри
    </button>
  </section>
</template>
