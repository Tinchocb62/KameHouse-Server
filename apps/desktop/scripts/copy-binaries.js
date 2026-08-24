const fs = require('fs');
const path = require('path');

const serverExe = path.resolve(__dirname, '../../server/kamehouse.exe');
const binDir = path.resolve(__dirname, '../src-tauri/binaries');

if (fs.existsSync(serverExe)) {
  fs.mkdirSync(binDir, { recursive: true });
  const names = [
    'kamehouse-server-windows.exe',
    'kamehouse-server-darwin-amd64',
    'kamehouse-server-darwin-arm64',
    'kamehouse-server-linux-amd64',
    'kamehouse-server-linux-arm64'
  ];
  for (const name of names) {
    fs.copyFileSync(serverExe, path.join(binDir, `${name}-x86_64-pc-windows-msvc.exe`));
    fs.copyFileSync(serverExe, path.join(binDir, `${name}.exe`));
    fs.copyFileSync(serverExe, path.join(binDir, name));
  }
}
