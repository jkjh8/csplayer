<template>
  <q-card>
    <q-card-section>
      <div class="row justify-between">
        <div class="row q-gutter-md">
          <span>
            <q-icon name="svguse:icons.svg#play-pc" size="sm"/>
          </span>
          <span class="title">
            Player {{id}}
          </span>
        </div>

        <div>
          Status
        </div>
      </div>
    </q-card-section>

    <q-separator />

    <q-card-section>
      <div class="q-px-md">
        <audio
          controls
          ref="player"
          :src="playSource"
        />
        <div>
          {{ fileName }}
        </div>
        <div>
          <q-select
            v-model="device"
            filled
            label="Select Audio Outoput Device"
            :options="devices"
            option-value="deviceId"
            @update:model-value="fnUpdateDevice"
          />
        </div>
      </div>
    </q-card-section>
  </q-card>
</template>

<script>
import { ref, computed, toRefs, watch, onMounted } from 'vue'
import { useStore } from 'vuex'

export default {
  props: ['id', 'status'],
  setup (props) {
    const { getters } = useStore()
    const { id, status } = toRefs(props)

    const player = ref(null)
    const device = ref(null)
    const playSource = ref('')
    const fileName = ref('')
    const devices = computed(() => getters['devices/getAudioOutputs'])

    function fnUpdateDevice (value) {
      player.value.setSinkId(value.deviceId)
      window.data.onRequest(value.deviceId)
    }

    function updateData () {
      console.log(status.value)
    }

    watch(status, updateData)

    onMounted(() => {
      console.log('player', id.value)
      window.data.onResponse((args) => {
        if (args.file) {
          fileName.value = args.file.name
          playSource.value = `http://localhost:3000/${args.file.base}/${args.file.src}/${args.file.name}`
        }
      })
    })

    return {
      player,
      device,
      devices,
      fileName,
      playSource,
      fnUpdateDevice
    }
  }
}
</script>
