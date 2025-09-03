const { app, BrowserWindow, ipcMain, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');

let mainWindow;
const transcriptionsDir = path.join(os.homedir(), 'transcriptions');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    icon: path.join(__dirname, '..', 'PRD', 'images', 'EchoDown_logo_transparent_hires.png'),
    title: 'EchoDown',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    },
    titleBarStyle: 'hiddenInset',
    resizable: true,
    minimizable: true,
    maximizable: true
  });

  mainWindow.loadFile('src/index.html');

  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }
}

app.whenReady().then(() => {
  if (!fs.existsSync(transcriptionsDir)) {
    fs.mkdirSync(transcriptionsDir, { recursive: true });
  }
  
  createWindow();
  createMenu();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

function createMenu() {
  const template = [
    {
      label: 'EchoDown',
      submenu: [
        {
          label: 'About EchoDown',
          click: () => {
            const { dialog } = require('electron');
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'About EchoDown',
              message: 'EchoDown',
              detail: `Version 1.250902\n\nAn AI Built App from SKYideas / Rob Kellington\n\nLocal audio transcription using OpenAI Whisper`,
              icon: path.join(__dirname, '..', 'PRD', 'images', 'EchoDown_logo_transparent_hires.png')
            });
          }
        },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideothers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectall' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'close' }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

ipcMain.handle('transcribe-audio', async (event, audioFilePath) => {
  return new Promise((resolve, reject) => {
    // Handle both development and packaged app paths
    let pythonExecutable, pythonScript;
    
    if (app.isPackaged) {
      // In packaged app, use bundled Python environment
      pythonExecutable = path.join(process.resourcesPath, 'app.asar.unpacked', 'python_env', 'bin', 'python3');
      pythonScript = path.join(process.resourcesPath, 'app.asar.unpacked', 'python', 'transcribe.py');
    } else {
      // In development, use local virtual environment if it exists, otherwise system python
      const localPython = path.join(__dirname, '..', 'python_env', 'bin', 'python3');
      pythonExecutable = fs.existsSync(localPython) ? localPython : 'python3';
      pythonScript = path.join(__dirname, '..', 'python', 'transcribe.py');
    }
    
    const pythonProcess = spawn(pythonExecutable, [pythonScript, audioFilePath]);
    
    let output = '';
    let errorOutput = '';
    
    pythonProcess.stdout.on('data', (data) => {
      output += data.toString();
    });
    
    pythonProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });
    
    pythonProcess.on('close', (code) => {
      console.log(`Python script path: ${pythonScript}`);
      console.log(`Python process exit code: ${code}`);
      console.log(`Python stdout: ${output}`);
      console.log(`Python stderr: ${errorOutput}`);
      
      if (code === 0) {
        resolve(output.trim());
      } else {
        reject(new Error(`Python process failed (code ${code}): ${errorOutput || 'No error details'}`));
      }
    });
  });
});

ipcMain.handle('get-transcriptions-dir', () => {
  return transcriptionsDir;
});

ipcMain.handle('get-recent-transcriptions', () => {
  try {
    const files = fs.readdirSync(transcriptionsDir)
      .filter(file => file.endsWith('.md'))
      .map(file => {
        const filePath = path.join(transcriptionsDir, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          path: filePath,
          created: stats.birthtime
        };
      })
      .sort((a, b) => b.created - a.created)
      .slice(0, 10);
    
    return files;
  } catch (error) {
    console.error('Error reading transcriptions directory:', error);
    return [];
  }
});