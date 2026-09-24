<script setup lang="ts">
const { isEnabled, flags, getVariant, getValue } = useFeatureFlags()
const { pending, refresh } = useAsyncFeatureFlags({ immediate: false })
</script>

<template>
  <div class="p-6 max-w-4xl mx-auto">
    <h1 class="text-3xl font-bold mb-6">
      Feature Flags with Variants Demo
    </h1>

    <!-- Simple Feature Flags -->
    <section class="mb-8">
      <h2 class="text-2xl font-semibold mb-4">
        Simple Feature Flags
      </h2>
      <div class="space-y-2">
        <div>
          <strong>Experimental Feature:</strong>
          <span :class="isEnabled('experimentalFeature') ? 'text-green-600' : 'text-red-600'">
            {{ isEnabled('experimentalFeature') ? 'Enabled' : 'Disabled' }}
          </span>
          <ExperimentalFeature v-if="isEnabled('experimentalFeature')" />
        </div>
        <div>
          <strong>New Dashboard:</strong>
          <span :class="isEnabled('newDashboard') ? 'text-green-600' : 'text-red-600'">
            {{ isEnabled('newDashboard') ? 'Enabled' : 'Disabled' }}
          </span>
        </div>
      </div>
    </section>

    <!-- A/B Test Example -->
    <section class="mb-8">
      <h2 class="text-2xl font-semibold mb-4">
        A/B Test Example
      </h2>
      <div class="p-4 border rounded">
        <div class="mb-2">
          <strong>Flag:</strong> abTestExample<br>
          <strong>Variant:</strong> {{ getVariant('abTestExample') || 'none' }}<br>
          <strong>Value:</strong> {{ getValue('abTestExample') }}
        </div>
        <div
          v-if="isEnabled('abTestExample:control')"
          class="p-2 bg-gray-100"
        >
          🅰️ Control Version: You're seeing the original design
        </div>
        <div
          v-if="isEnabled('abTestExample:treatment')"
          class="p-2 bg-blue-100"
        >
          🅱️ Treatment Version: You're seeing the new design!
        </div>
      </div>
    </section>

    <!-- Button Color Variants -->
    <section class="mb-8">
      <h2 class="text-2xl font-semibold mb-4">
        A/B/C/D Test - Button Colors
      </h2>
      <div class="mb-4">
        <strong>Assigned variant:</strong> {{ getVariant('buttonColor') }}<br>
        <strong>Color value:</strong> {{ getValue('buttonColor') }}
      </div>
      <div class="flex gap-4 flex-wrap">
        <button
          v-if="isEnabled('buttonColor:blue')"
          class="px-4 py-2 bg-blue-500 text-white rounded"
        >
          Blue Button (40% chance)
        </button>
        <button
          v-if="isEnabled('buttonColor:green')"
          class="px-4 py-2 bg-green-500 text-white rounded"
        >
          Green Button (30% chance)
        </button>
        <button
          v-if="isEnabled('buttonColor:red')"
          class="px-4 py-2 bg-red-500 text-white rounded"
        >
          Red Button (20% chance)
        </button>
        <button
          v-if="isEnabled('buttonColor:purple')"
          class="px-4 py-2 bg-purple-500 text-white rounded"
        >
          Purple Button (10% chance)
        </button>
      </div>
    </section>

    <!-- Premium Feature Rollout -->
    <section class="mb-8">
      <h2 class="text-2xl font-semibold mb-4">
        Premium Feature (20% Rollout)
      </h2>
      <div class="p-4 border rounded">
        <div class="mb-2">
          <strong>Variant:</strong> {{ getVariant('premiumFeature') }}<br>
          <strong>Has Premium:</strong> {{ getValue('premiumFeature') }}
        </div>
        <div
          v-if="isEnabled('premiumFeature:free')"
          class="p-2 bg-gray-100"
        >
          😔 You're in the free tier (80% of users)
        </div>
        <div
          v-if="isEnabled('premiumFeature:premium')"
          class="p-2 bg-gold-100 border-2 border-yellow-400"
        >
          ⭐ Congratulations! You have premium access (20% of users)
        </div>
      </div>
    </section>

    <!-- Gradual Rollout -->
    <section class="mb-8">
      <h2 class="text-2xl font-semibold mb-4">
        New Checkout (30% Rollout)
      </h2>
      <div class="p-4 border rounded">
        <div class="mb-2">
          <strong>Variant:</strong> {{ getVariant('newCheckout') }}<br>
          <strong>Using New Checkout:</strong> {{ getValue('newCheckout') }}
        </div>
        <div
          v-if="isEnabled('newCheckout:old')"
          class="p-2 bg-gray-100"
        >
          📋 Old checkout process (70% of users)
        </div>
        <div
          v-if="isEnabled('newCheckout:new')"
          class="p-2 bg-green-100"
        >
          ✨ New streamlined checkout! (30% of users)
        </div>
      </div>
    </section>

    <!-- Debug Information -->
    <section class="mt-12">
      <h2 class="text-2xl font-semibold mb-4">
        Debug Information
      </h2>
      <button
        class="mb-4 px-4 py-2 border rounded"
        :disabled="pending"
        @click="refresh()"
      >
        {{ pending ? 'Refreshing…' : 'Refresh flags' }}
      </button>
      <pre class="bg-gray-100 p-4 rounded text-sm overflow-auto">{{ JSON.stringify(flags, null, 2) }}</pre>
    </section>
  </div>
</template>

<style scoped>
.bg-gold-100 {
  background-color: #fef3c7;
}
</style>
