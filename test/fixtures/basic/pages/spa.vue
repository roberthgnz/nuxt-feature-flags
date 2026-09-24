<script setup lang="ts">
const { isEnabled } = useFeatureFlags()
</script>

<template>
  <p id="spa">
    spa-dashboard:{{ isEnabled('newDashboard') }}
  </p>
</template>
