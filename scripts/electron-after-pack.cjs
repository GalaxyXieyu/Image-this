const path = require('path');
const fs = require('fs');
const ResEdit = require('resedit');
const {
  collectSignableFiles,
  hasWindowsSigningConfig,
  signFiles,
} = require('./windows-signing-utils.cjs');

function patchExeIcon(exePath, iconPath) {
  const exeData = fs.readFileSync(exePath);
  const exe = ResEdit.NtExecutable.from(exeData);
  const res = ResEdit.NtExecutableResource.from(exe);

  const iconFile = ResEdit.Data.IconFile.from(fs.readFileSync(iconPath));
  const iconGroups = ResEdit.Resource.IconGroupEntry.fromEntries(res.entries);
  const iconGroupId = iconGroups.length > 0 ? iconGroups[0].id : 1;

  ResEdit.Resource.IconGroupEntry.replaceIconsForResource(
    res.entries,
    iconGroupId,
    1033,
    iconFile.icons.map((item) => item.data)
  );

  res.outputResource(exe);
  fs.writeFileSync(exePath, Buffer.from(exe.generate()));
}

module.exports = async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') {
    return;
  }

  const iconPath = path.join(context.packager.projectDir, 'build', 'icon.ico');
  const productFilename =
    context.packager.appInfo.productFilename || context.packager.appInfo.productName || 'ImagineThis';
  const mainExecutablePath = path.join(context.appOutDir, `${productFilename}.exe`);

  if (fs.existsSync(iconPath) && fs.existsSync(mainExecutablePath)) {
    console.log(`[afterPack] Updating Windows executable icon: ${mainExecutablePath}`);
    patchExeIcon(mainExecutablePath, iconPath);
    console.log('[afterPack] Icon patched successfully with resedit.');
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