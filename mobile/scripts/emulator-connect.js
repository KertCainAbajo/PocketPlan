/**
 * Connects the Android emulator straight to this PC (adb reverse), so the app
 * loads from 127.0.0.1:8081 and reaches the Laravel API at 127.0.0.1:8000.
 * The emulator forgets these on every restart, so `npm run emulator` runs this first.
 */
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const sdk = process.env.ANDROID_HOME || path.join(process.env.LOCALAPPDATA || '', 'Android', 'Sdk');
const adb = path.join(sdk, 'platform-tools', process.platform === 'win32' ? 'adb.exe' : 'adb');

try {
  for (const port of [8081, 8000]) {
    execFileSync(adb, ['reverse', `tcp:${port}`, `tcp:${port}`], { stdio: 'inherit' });
  }
  console.log('Emulator connected: app on 127.0.0.1:8081, API on 127.0.0.1:8000.');
} catch {
  console.error('Could not connect to the emulator. Is it running? Start it first, then run this again.');
  process.exit(1);
}
