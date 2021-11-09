import { app, BrowserWindow, nativeTheme, ipcMain } from 'electron'

import path from 'path'
import os from 'os'
import dgram from 'dgram'

// needed in case process is undefined under Linux
const platform = process.platform || os.platform()

try {
  if (platform === 'win32' && nativeTheme.shouldUseDarkColors === true) {
    require('fs').unlinkSync(path.join(app.getPath('userData'), 'DevTools Extensions'))
  }
} catch (_) { }

// determine which icon to use for the platform
// works for both dev and build
const iconPath = path.resolve(__dirname, 'icons',
  platform === 'win32' ? 'icon.ico'
    : platform === 'darwin' ? 'icon.icns'
      : 'linux-512x512.png'
)

let mainWindow

function createWindow () {
  /**
   * Initial window options
   */
  mainWindow = new BrowserWindow({
    icon: iconPath,
    width: 1000,
    height: 600,
    useContentSize: true,
    webPreferences: {
      contextIsolation: true,
      // More info: /quasar-cli/developing-electron-apps/electron-preload-script
      preload: path.resolve(__dirname, process.env.QUASAR_ELECTRON_PRELOAD)
    }
  })

  mainWindow.loadURL(process.env.APP_URL)

  if (process.env.DEBUGGING) {
    // if on DEV or Production with debug enabled
    mainWindow.webContents.openDevTools()
  } else {
    // we're on production; no access to devtools pls
    mainWindow.webContents.on('devtools-opened', () => {
      mainWindow.webContents.closeDevTools()
    })
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.on('ready', createWindow)

app.on('window-all-closed', () => {
  if (platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

// socket
const server = dgram.createSocket('udp4')
const multicastAddress = '230.185.192.12'
const serverPort = 12340

server.on('listening', () => {
  console.log('Multicast listening')
})

server.on('message', (msg) => {
  try {
    mainWindow.webContents.send('onResponse', JSON.parse(msg.toString()))
  } catch (err) {
    console.error('Multicast Server Recv Msg error - ', err)
  }
})

server.bind(12341, function () {
  server.setBroadcast(true)
  server.setMulticastTTL(128)
  server.addMembership(multicastAddress)
})

function sendCommand (cmd) {
  try {
    const rt = JSON.stringify(cmd)
    server.send(rt, 0, rt.length, serverPort, multicastAddress)
  } catch (err) {
    console.error('multicast send error - ', err)
  }
}

ipcMain.on('onRequest', (event, data) => {
  sendCommand(data)
})
