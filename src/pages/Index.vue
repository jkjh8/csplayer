<template>
  <q-page>
    <div style="margin: 5% 5%">
      <Player :id="1" :status="status" />
    </div>
  </q-page>
</template>

<script>
import { defineComponent, onMounted, computed } from 'vue'
import { useStore } from 'vuex'

import Player from '../components/player'

export default defineComponent({
  name: 'PageIndex',
  components: { Player },
  setup () {
    const { state, commit } = useStore()
    const status = computed(() => state.player.status)

    onMounted(async () => {
      const r = await navigator.mediaDevices.enumerateDevices({ audio: true, video: true })
      commit('devices/updateDevices', r)
    })

    return {
      status
    }
  }
})
</script>

<style scoped>
.title {
  font-family: 다음체;
}
</style>
