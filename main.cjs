const { app, BrowserWindow, Menu, nativeTheme, shell } = require('electron')
const express = require('express')
const fs = require('node:fs')
const http = require('node:http')
const net = require('node:net')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

const APP_NAME = '\u71c3\u70b9Skill'

function getAppRoot() {
  return app.isPackaged ? app.getAppPath() : path.resolve(__dirname, '..')
}

function getResourceRoot() {
  return app.isPackaged ? process.resourcesPath : path.resolve(getAppRoot(), '..')
}

function findFreePort(startPort) {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.unref()
    server.on('error', () => {
      findFreePort(startPort + 1).then(resolve, reject)
    })
    server.listen(startPort, '127.0.0.1', () => {
      const address = server.address()
      server.close(() => resolve(address.port))
    })
  })
}

function proxyRequest(targetPort, req, res) {
  const proxy = http.request(
    {
      hostname: '127.0.0.1',
      port: targetPort,
      path: req.originalUrl || req.url,
      method: req.method,
      headers: req.headers,
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 500, proxyRes.headers)
      proxyRes.pipe(res)
    },
  )
  proxy.on('error', (error) => {
    res.statusCode = 502
    res.end(`Local API unavailable: ${error.message}`)
  })
  req.pipe(proxy)
}

async function startApiServer(port) {
  const resourceRoot = getResourceRoot()
  const userDataRoot = path.join(app.getPath('userData'), 'runtime')
  fs.mkdirSync(userDataRoot, { recursive: true })

  process.env.PORT = String(port)
  process.env.SKILLS_ROOT = path.join(resourceRoot, 'outputs', 'd-design-skills')
  process.env.DATA_ROOT = path.join(userDataRoot, 'data')
  process.env.PROJECTS_ROOT = path.join(userDataRoot, 'data', 'projects')
  process.env.DOWNLOADS_ROOT = path.join(app.getPath('downloads'), APP_NAME)

  await import(pathToFileURL(path.join(getAppRoot(), 'server', 'index.js')).href)
}

async function startWebServer(apiPort) {
  const web = express()
  const distRoot = path.join(getAppRoot(), 'dist')

  web.use('/api', (req, res) => proxyRequest(apiPort, req, res))
  web.use('/files', (req, res) => proxyRequest(apiPort, req, res))
  web.use(express.static(distRoot))
  web.use((_req, res) => {
    res.sendFile(path.join(distRoot, 'index.html'))
  })

  const port = await findFreePort(15174)
  await new Promise((resolve) => {
    web.listen(port, '127.0.0.1', resolve)
  })
  return port
}

async function createWindow() {
  app.setName(APP_NAME)
  Menu.setApplicationMenu(null)
  nativeTheme.themeSource = 'dark'
  const iconPath = path.join(getAppRoot(), 'build', 'icon.png')
  const apiPort = await findFreePort(18788)
  await startApiServer(apiPort)
  const webPort = await startWebServer(apiPort)

  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 1040,
    minHeight: 680,
    title: APP_NAME,
    icon: iconPath,
    autoHideMenuBar: true,
    titleBarStyle: 'hidden',
    backgroundColor: '#2c3035',
    darkTheme: true,
    titleBarOverlay: {
      color: '#2c3035',
      symbolColor: '#f4f7f8',
      height: 24,
    },
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
  await win.loadURL(`http://127.0.0.1:${webPort}`)
  await win.webContents.insertCSS(`
    .desktop-titlebar {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 24px;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 140px 0 8px;
      background: #2c3035;
      border-bottom: 1px solid rgba(160, 168, 176, 0.34);
      color: rgba(244, 247, 248, 0.92);
      font: 12px/24px "Segoe UI", "Microsoft YaHei UI", sans-serif;
      -webkit-app-region: drag;
      z-index: 2147483647;
    }

    .desktop-titlebar-mark {
      width: 16px;
      height: 16px;
      display: grid;
      place-items: center;
      flex: 0 0 auto;
      border-radius: 3px;
      background: #05070a;
      color: #ffffff;
      font-size: 10px;
      font-weight: 700;
      line-height: 1;
    }

    .desktop-titlebar-name {
      overflow: hidden;
      white-space: nowrap;
      text-overflow: ellipsis;
      line-height: 24px;
    }

    .app-frame {
      padding-top: 44px;
      background: #2c3035;
    }

    .workspace {
      height: calc(100vh - 44px);
    }

    .topbar {
      min-height: 104px;
      padding-top: 14px;
      align-items: center;
    }

    .topbar .brand {
      line-height: 1.35;
      overflow: visible;
    }

    .topbar span {
      margin-top: 3px;
      line-height: 1.45;
      overflow: visible;
    }

    button,
    input,
    textarea,
    select,
    a,
    [role='button'] {
      -webkit-app-region: no-drag;
    }
  `)
  await win.webContents.executeJavaScript(`
    (() => {
      if (document.querySelector('.desktop-titlebar')) return
      const titlebar = document.createElement('div')
      titlebar.className = 'desktop-titlebar'
      titlebar.innerHTML = '<span class="desktop-titlebar-mark">燃</span><span class="desktop-titlebar-name">燃点Skill</span>'
      document.body.prepend(titlebar)
    })()
  `)
}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
