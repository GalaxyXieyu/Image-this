!macro CleanImagineThisUserData
  RMDir /r "$APPDATA\ImagineThis"
  RMDir /r "$LOCALAPPDATA\ImagineThis"
  RMDir /r "$PROFILE\ImagineThis"
!macroend

!macro customInstall
  DetailPrint "Cleaning old ImagineThis database, history, and cache..."
  !insertmacro CleanImagineThisUserData
!macroend

!macro customUnInstall
  DetailPrint "Removing ImagineThis database, history, and cache..."
  !insertmacro CleanImagineThisUserData
!macroend
