const path = require('path');
const { rcedit } = require('rcedit');
const {
  collectSignableFiles,
  hasWindowsSigningConfig,
  signFiles,
} = require('./windows-signing-utils.cjs');

module.exports = async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') {
    return;
  }

  const iconPath = path.join(context.packager.projectDir, 'build', 'icon.ico');
  const productFilename =
    context.packager.appInfo.productFilename || context.packager.appInfo.productName || 'ImagineThis';
  const mainExecutablePath = path.join(context.appOutDir, `${productFilename}.exe`);

  console.log(`[afterPack] Updating Windows executable icon: ${mainExecutablePath}`);
  await rcedit(mainExecutablePath, {
    icon: iconPath,
  });

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
