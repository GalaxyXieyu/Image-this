# Windows Code Signing

This project now supports a signing flow that works with the custom Windows icon patch and the desktop installer build.

## Why this matters

On Windows machines with Smart App Control or stricter Code Integrity policies, an unsigned desktop app can be blocked before it ever opens. A locally self-signed certificate is useful for plumbing tests, but it is not enough for machines that require a trusted and reputable publisher.

## What the build does now

1. During Electron `afterPack`, the build rewrites the main EXE icon.
2. If signing variables are present, it signs all Windows binaries inside the packaged app.
3. After the installer and portable artifacts are created, the build signs the final `.exe` artifacts too.

This ordering matters because changing EXE resources after signing invalidates the signature.

## Supported environment variables

Set these before running `npm run build:windows`:

```powershell
$env:WINDOWS_SIGN_CERT_PATH="C:\path\to\certificate.pfx"
$env:WINDOWS_SIGN_CERT_PASSWORD="your-password"
$env:WINDOWS_SIGN_TIMESTAMP_URL="http://timestamp.digicert.com"
$env:WINDOWS_SIGN_URL="https://bojie.store"
$env:WINDOWS_SIGN_DESCRIPTION="ImagineThis"
```

Optional selector variables:

```powershell
$env:WINDOWS_SIGN_CERT_SHA1="THUMBPRINT"
$env:WINDOWS_SIGN_CERT_SUBJECT="Your Company Name"
$env:WINDOWS_SIGN_TOOL_PATH="C:\Program Files (x86)\Windows Kits\10\App Certification Kit\signtool.exe"
```

## Recommended certificate

For public Windows desktop distribution, use a real OV or EV code-signing certificate from a trusted CA. That is the path that removes the "unknown publisher" and Smart App Control reputation block on user machines.

## Local note

If no signing variables are set, the build still succeeds, but it stays unsigned and Windows may block launch on locked-down machines.
