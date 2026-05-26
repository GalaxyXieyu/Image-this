# Desktop Release Pipeline

This project publishes Windows desktop updates through GitHub Releases. The desktop app uses a generic electron-updater feed that points at the latest release assets.

## What happens on release

1. Push a version tag like `v0.2.3`.
2. GitHub Actions builds the Windows installer and portable package.
3. The workflow uploads the artifacts to a GitHub Release.
4. Installed desktop clients check `DESKTOP_UPDATE_FEED_URL/latest.yml` and auto-download updates.
5. The legacy `bojie.store` upload remains in the workflow for compatibility, but GitHub Release assets are the preferred update source.

## Required GitHub configuration

Repository secrets:

- `SERVER_HOST`
- `SERVER_USER`
- `SERVER_PORT`
- `SERVER_SSH_KEY`

Repository variables:

- `DESKTOP_UPDATE_BASE_URL`
- `WINDOWS_UPDATE_REMOTE_DIR`

Recommended values for the current setup:

- `DESKTOP_UPDATE_FEED_URL=https://github.com/GalaxyXieyu/Image-this/releases/latest/download`
- `WINDOWS_UPDATE_REMOTE_DIR=/data/imagine-this-updates/windows`

## Release steps

1. Update `package.json` version.
2. Commit your changes.
3. Create and push the matching tag:

```bash
git tag v0.2.3
git push origin main --tags
```

4. Wait for the `Build And Publish Windows App` workflow to finish.
5. Open the installed app and trigger update check from Settings if you want to verify immediately.
