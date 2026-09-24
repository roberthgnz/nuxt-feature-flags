<script setup lang="ts">
const { isEnabled, getValue, getVariant } = useFeatureFlags()
</script>

<template>
  <div>
    <p id="admin">
      admin:{{ isEnabled('isAdmin') }}
    </p>
    <p id="dashboard">
      dashboard:{{ isEnabled('newDashboard') }}
    </p>
    <p id="inline">
      inline:{{ getValue('inlineOnly') }}
    </p>
    <p id="overridden">
      overridden:{{ isEnabled('overridden') }}
    </p>
    <p id="variant">
      variant:{{ getVariant('checkout') }}
    </p>
    <p id="value">
      value:{{ getValue('checkout') }}
    </p>
    <p
      v-if="isEnabled('checkout:control')"
      id="control"
    >
      control
    </p>
    <p
      v-if="isEnabled('checkout:treatment')"
      id="treatment"
    >
      treatment
    </p>
    <p
      id="directive-on"
      v-feature="'newDashboard'"
    >
      shown
    </p>
    <p
      id="directive-off"
      v-feature="'hiddenFeature'"
    >
      hidden
    </p>
  </div>
</template>
