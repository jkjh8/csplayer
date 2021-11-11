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
          <q-icon
            :name="status ? 'svguse:icons.svg#play':'svguse:icons.svg#stop'"
            :color="status ? 'teal':'red'"
            size="sm"
          />
          <q-btn
            icon="svguse:icons.svg#ban"
            flat
            round
            color="red"
            @click="fnStopAll"
          />
        </div>
      </div>
    </q-card-section>

    <q-separator />

    <q-card-section class="q-pt-none q-px-none">
      <q-linear-progress :value="percentage" />
      <div class="q-pa-md">
        <div class="q-px-md q-gutter-sm">
          <div>
            <div class="text-grey">
              Play File
            </div>
            <div class="q-pa-sm">
              {{ fileName ? fileName:'None' }}
            </div>
          </div>
          <div>
            <q-select
              v-model="device"
              filled
              label="Select Audio Outoput Device"
              :options="devices"
              option-value="deviceId"
              option-label="label"
              emit-value
              map-options
              @update:model-value="fnUpdateDevice"
            />
          </div>

          <div>
            <q-select
              v-model="chimeFile"
              filled
              :options="files"
              label="Select Chime File"
              option-label="name"
              option-value="link"
              map-options
              emit-value
              @update:model-value="fnUpdateChimeFile"
            />
          </div>
        </div>
      </div>
    </q-card-section>
  </q-card>
  <audio
    class="q-ma-lg"
    controls
    ref="player"
    @loadedmetadata="loadedmetadata"
    @ended="onEnd"
  />
</template>

<script>
import { ref, computed, toRefs, onMounted } from 'vue'
import { useStore } from 'vuex'
import { api } from '../boot/axios'

export default {
  props: ['id'],
  setup (props) {
    const { getters } = useStore()
    const { id } = toRefs(props)

    const player = ref(null)
    const device = ref(null)
    const fileName = ref('')
    const duration = ref(0)
    const chime = ref(new Audio())
    const interval = ref(null)
    const status = ref(false)
    const chimeFile = ref(null)
    const files = ref([])
    const devices = computed(() => getters['devices/getAudioOutputs'])

    const percentage = computed(() => {
      if (player.value && player.value.duration !== 0) {
        return Math.floor(player.value.currentTime) / Math.floor(player.value.duration)
      } else {
        return 0
      }
    })

    function fnUpdateDevice () {
      console.log(device.value)
      window.db.set({ key: `deviceId,${id.value}`, value: device.value })
      player.value.setSinkId(device.value)
      sendMsg()
    }

    function fnUpdateChimeFile () {
      window.db.set({ key: `chime,${id.value}`, value: chimeFile.value })
    }

    function loadedmetadata (data) {
      duration.value = player.value.duration
      player.value.play()
      status.value = true
      sendMsg()
    }

    function onEnd () {
      console.log('onEnd')
      status.value = false
      sendMsg('end')
    }

    function sendMsg (command) {
      const rt = {}
      rt.playerId = 1
      if (command) {
        rt.command = command
      }
      if (device.value) {
        rt.deviceId = device.value
      } else {
        rt.deviceId = 'default'
      }
      if (player.value) {
        rt.duration = Math.floor(player.value.duration)
        rt.currentTime = Math.floor(player.value.currentTime)
      }
      if (player.value && player.value.ended) {
        rt.ended = true
      } else {
        rt.ended = false
      }
      if (player.value && player.value.src) {
        rt.src = player.value.src
      }
      if (player.value && player.value.playing) {
        rt.playing = player.value.playing
      }
      window.data.onRequest(rt)
    }

    function chimePlay () {
      return new Promise((resolve, reject) => {
        console.log('start chime')
        let chimeCheck
        try {
          chime.value.src = chimeFile.value
          setTimeout(() => {
            chime.value.setSinkId(device.value)
            chime.value.volume = 0.7
            chime.value.play()
            chimeCheck = setInterval(() => {
              console.log('chime')
              if (chime.value.ended) {
                chime.value.src = ''
                clearInterval(chimeCheck)
                resolve()
              }
            }, 1000)
          }, 1000)
          setTimeout(() => {
            clearInterval(chimeCheck)
            resolve()
          }, 6000)
        } catch (err) {
          clearInterval(chimeCheck)
          reject(err)
        }
      })
    }

    function play (args) {
      console.log(args)
      return new Promise((resolve, reject) => {
        try {
          player.value.setSinkId(device.value)
          player.value.volume = args.vol / 100
          player.value.src = `http://localhost:3000/${args.file.base}/${args.file.src}/${args.file.name}`
          interval.value = setInterval(() => {
            sendMsg()
            if (player.value.ended || !player.value.src) {
              if (player.value.src) {
                player.value.src = ''
              }
              clearInterval(interval.value)
              console.log('resolve player')
              resolve()
            }
          }, 1000)
        } catch (err) {
          clearInterval(interval.value)
          reject('Error Player', err)
        }
      })
    }

    async function getSoundFiles () {
      const rt = []
      const r = await api.post('http://localhost:3000/api/files', { folder: 'sound', path: [] })
      console.log(r)
      r.data.files.forEach(file => {
        rt.push({
          name: file.name,
          link: `http://localhost:3000/${file.base}/${file.src}/${file.name}`
        })
      })
      files.value = rt
    }

    function fnStopAll () {
      chime.value.pause()
      chime.value.src = ''
      player.value.pause()
      player.value.src = ''
      sendMsg('end')
    }

    onMounted(() => {
      console.log('player', id.value)
      getSoundFiles()
      window.db.get()
      window.db.return((args) => {
        args.forEach(setup => {
          const command = setup.key.split(',')
          if (command[0] === 'deviceId' && Number(command[1]) === id.value) {
            device.value = setup.value
          }
          if (command[0] === 'chime' && Number(command[1]) === id.value) {
            chimeFile.value = setup.value
          }
        })
      })
      window.data.onResponse(async (args) => {
        if (args.startChime) {
          await chimePlay()
        }
        if (args.command === 'play' && args.file) {
          await play(args)
          sendMsg()
        } else if (args.command === 'stop') {
          // player.value.pause()
          clearInterval(interval.value)
          if (player.value.src) {
            player.value.src = ''
          }
          status.value = false
          sendMsg()
        }
      })
    })

    return {
      player,
      device,
      devices,
      status,
      fileName,
      fnUpdateDevice,
      fnStopAll,
      loadedmetadata,
      onEnd,
      chime,
      percentage,
      chimeFile,
      files,
      fnUpdateChimeFile
    }
  }
}
</script>
