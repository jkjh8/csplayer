/*
export function someMutation (state) {
}
*/
export function updateStatus (state, payload) {
  state.status = payload
}

export function updateCommand (state, payload) {
  state.command = payload
}
