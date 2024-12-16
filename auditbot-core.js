// main.js - Electron main process
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');

let mainWindow;
let db;

// Database initialization
async function initDatabase() {
  db = await open({
    filename: path.join(app.getPath('userData'), 'auditbot.db'),
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS files (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT UNIQUE,
      hash TEXT,
      size INTEGER,
      last_accessed DATETIME,
      last_modified DATETIME,
      file_type TEXT,
      is_duplicate BOOLEAN DEFAULT false
    );

    CREATE TABLE IF NOT EXISTS scan_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scan_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      total_files INTEGER,
      total_size INTEGER,
      duplicates_found INTEGER,
      space_saved INTEGER
    );
  `);
}

// File scanning functionality
async function scanDirectory(dirPath) {
  const files = [];
  const hashMap = new Map();

  async function walkDir(currentPath) {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      
      if (entry.isDirectory()) {
        await walkDir(fullPath);
      } else {
        const stats = await fs.stat(fullPath);
        const fileBuffer = await fs.readFile(fullPath);
        const hash = crypto.createHash('sha256').update(fileBuffer).digest('hex');
        
        const fileInfo = {
          path: fullPath,
          hash,
          size: stats.size,
          last_accessed: stats.atime,
          last_modified: stats.mtime,
          file_type: path.extname(fullPath).toLowerCase(),
          is_duplicate: false
        };

        if (hashMap.has(hash)) {
          fileInfo.is_duplicate = true;
          hashMap.get(hash).is_duplicate = true;
        } else {
          hashMap.set(hash, fileInfo);
        }

        files.push(fileInfo);
      }
    }
  }

  await walkDir(dirPath);
  return files;
}

// Cache file detection
function isCacheFile(filePath) {
  const cachePatterns = [
    /\.cache$/i,
    /\.tmp$/i,
    /\.temp$/i,
    /thumbs\.db$/i,
    /\.log$/i
  ];
  
  return cachePatterns.some(pattern => pattern.test(filePath));
}

// Unused file detection (files not accessed in last 90 days)
function isUnused(lastAccessed) {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
  return new Date(lastAccessed) < ninetyDaysAgo;
}

// IPC Handlers
ipcMain.handle('start-scan', async (event, dirPath) => {
  try {
    const files = await scanDirectory(dirPath);
    
    // Group files by type for visualization
    const filesByType = {};
    let totalSize = 0;
    let duplicateCount = 0;
    
    for (const file of files) {
      const type = file.file_type || 'unknown';
      if (!filesByType[type]) {
        filesByType[type] = {
          count: 0,
          size: 0,
          duplicates: 0
        };
      }
      
      filesByType[type].count++;
      filesByType[type].size += file.size;
      if (file.is_duplicate) {
        filesByType[type].duplicates++;
        duplicateCount++;
      }
      
      totalSize += file.size;
      
      // Store file info in database
      await db.run(`
        INSERT OR REPLACE INTO files 
        (path, hash, size, last_accessed, last_modified, file_type, is_duplicate)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        file.path,
        file.hash,
        file.size,
        file.last_accessed.toISOString(),
        file.last_modified.toISOString(),
        file.file_type,
        file.is_duplicate
      ]);
    }
    
    // Store scan results
    await db.run(`
      INSERT INTO scan_history 
      (total_files, total_size, duplicates_found, space_saved)
      VALUES (?, ?, ?, ?)
    `, [
      files.length,
      totalSize,
      duplicateCount,
      duplicateCount > 0 ? files.filter(f => f.is_duplicate).reduce((acc, f) => acc + f.size, 0) : 0
    ]);
    
    return {
      files,
      filesByType,
      totalSize,
      duplicateCount
    };
  } catch (error) {
    console.error('Scan error:', error);
    throw error;
  }
});

ipcMain.handle('cleanup-files', async (event, filePaths) => {
  const results = [];
  for (const filePath of filePaths) {
    try {
      await fs.unlink(filePath);
      await db.run('DELETE FROM files WHERE path = ?', [filePath]);
      results.push({ path: filePath, success: true });
    } catch (error) {
      results.push({ path: filePath, success: false, error: error.message });
    }
  }
  return results;
});

// Create main window
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(async () => {
  await initDatabase();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
