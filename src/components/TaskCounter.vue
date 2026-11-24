<script setup>
// Додаткове завдання 3: показник кількості завдань, число передається через Props
defineProps({
  label: { type: String, required: true },
  value: { type: Number, required: true },
  variant: { type: String, default: 'default' },
})
</script>

<template>
  <div class="tf3-stat" :class="`tf3-stat--${variant}`">
    <span class="tf3-stat-label">{{ label }}</span>
    <strong>{{ value }}</strong>
  </div>
</template>
