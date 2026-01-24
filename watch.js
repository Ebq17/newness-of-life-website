// watch.js - Automatischer Build bei Änderungen
'use strict';

const chokidar = require('chokidar');
const { exec } = require('child_process');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');

console.log('\n👀 Überwache Änderungen in /data ...\n');
console.log('   Wenn du im Admin speicherst, wird automatisch neu gebaut.\n');
console.log('   Drücke Strg+C zum Beenden.\n');
console.log('─'.repeat(50));

let buildTimeout = null;

// Debounce: Warte 500ms nach letzter Änderung
function triggerBuild() {
  if (buildTimeout) {
    clearTimeout(buildTimeout);
  }

  buildTimeout = setTimeout(() => {
    console.log('\n🔨 Änderung erkannt - Build läuft...');

    exec('node build.js', (error, stdout, stderr) => {
      if (error) {
        console.log('❌ Build fehlgeschlagen:', error.message);
        return;
      }
      console.log(stdout);
      console.log('✅ Fertig! Seite im Browser neu laden.\n');
      console.log('─'.repeat(50));
    });
  }, 500);
}

// Überwache data-Ordner
const watcher = chokidar.watch(DATA_DIR, {
  ignored: /(^|[\/\\])\../, // Ignoriere versteckte Dateien
  persistent: true,
  ignoreInitial: true
});

watcher
  .on('change', (filePath) => {
    const relativePath = path.relative(__dirname, filePath);
    console.log(`\n📝 Geändert: ${relativePath}`);
    triggerBuild();
  })
  .on('add', (filePath) => {
    const relativePath = path.relative(__dirname, filePath);
    console.log(`\n➕ Neu: ${relativePath}`);
    triggerBuild();
  });

// Bei Beendigung aufräumen
process.on('SIGINT', () => {
  console.log('\n\n👋 Überwachung beendet.\n');
  watcher.close();
  process.exit();
});
