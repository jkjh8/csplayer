/*
export function someGetter (state) {
}
*/
export function getAudioOutputs (state) {
  const rt = []
  state.devices.forEach(device => {
    if (device.kind === 'audiooutput') {
      rt.push(device)
    }
  })
  return rt
}
