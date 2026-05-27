!macro customInstall
  DetailPrint "Preserving existing ImagineThis user data during install/update."

  DetailPrint "Refreshing ImagineThis shortcuts and icons."
  !ifdef MENU_FILENAME
    CreateDirectory "$SMPROGRAMS\${MENU_FILENAME}"
    Delete "$oldStartMenuLink"
    Delete "$SMPROGRAMS\${MENU_FILENAME}\${SHORTCUT_NAME}.lnk"
    CreateShortCut "$SMPROGRAMS\${MENU_FILENAME}\${SHORTCUT_NAME}.lnk" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" "" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" 0 "" "" "${APP_DESCRIPTION}"
    WinShell::SetLnkAUMI "$SMPROGRAMS\${MENU_FILENAME}\${SHORTCUT_NAME}.lnk" "${APP_ID}"
  !else
    Delete "$oldStartMenuLink"
    Delete "$SMPROGRAMS\${SHORTCUT_NAME}.lnk"
    CreateShortCut "$SMPROGRAMS\${SHORTCUT_NAME}.lnk" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" "" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" 0 "" "" "${APP_DESCRIPTION}"
    WinShell::SetLnkAUMI "$SMPROGRAMS\${SHORTCUT_NAME}.lnk" "${APP_ID}"
  !endif

  ${ifNot} ${isNoDesktopShortcut}
    Delete "$oldDesktopLink"
    Delete "$DESKTOP\${SHORTCUT_NAME}.lnk"
    CreateShortCut "$DESKTOP\${SHORTCUT_NAME}.lnk" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" "" "$INSTDIR\${APP_EXECUTABLE_FILENAME}" 0 "" "" "${APP_DESCRIPTION}"
    WinShell::SetLnkAUMI "$DESKTOP\${SHORTCUT_NAME}.lnk" "${APP_ID}"
  ${endIf}

  System::Call 'Shell32::SHChangeNotify(i 0x8000000, i 0, i 0, i 0)'
!macroend

!macro customUnInstall
  DetailPrint "Preserving ImagineThis user data during uninstall."
!macroend
