const path = require('path');
const { rcedit } = require('rcedit');
const {
  collectSignableFiles,
  hasWindowsSigningConfig,
  signFiles,
} = require('./windows-signing-utils.cjs');

const { execSync } = require('child_process');

function hasWine64() {
  try {
    execSync('which wine64', { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

module.exports = async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') {
    return;
  }

  const isMac = process.platform === 'darwin';
  const hasWine = hasWine64();

  if (isMac && !hasWine) {
    console.log('[afterPack] Skipping rcedit on macOS without wine64. Windows icon is set via electron-builder config.');
  } else {
    const iconPath = path.join(context.packager.projectDir, 'build', 'icon.ico');
    const productFilename =
      context.packager.appInfo.productFilename || context.packager.appInfo.productName || 'ImagineThis';
    const mainExecutablePath = path.join(context.appOutDir, `${productFilename}.exe`);

    console.log(`[afterPack] Updating Windows executable icon: ${mainExecutablePath}`);
    await rcedit(mainExecutablePath, {
      icon: iconPath,
    });
  }

  if (!hasWindowsSigningConfig(process.env)) {
    console.log(
      '[afterPack] Windows signing is not configured. The build will remain unsigned and can be blocked by Smart App Control.'
    );
    return;
  }

  const signableFiles = collectSignableFiles(context.appOutDir);
  console.log(`[afterPack] Signing ${signableFiles.length} Windows binaries inside app package...`);
  await signFiles(signableFiles, process.env);
};
