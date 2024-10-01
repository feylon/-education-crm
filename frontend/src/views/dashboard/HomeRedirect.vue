<script setup lang="ts">
import { AppLoading } from '@/components/ui';
import { homeRouteFor } from '@/router';
import { useAuthStore } from '@/stores/auth.store';
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';

const auth = useAuthStore();
const router = useRouter();

onMounted(() => void router.replace(homeRouteFor(auth)));
</script>

<template>
  <AppLoading />
</template>
