; build/installer.nsh
; Custom NSIS hooks for electron-builder
; Installs/uninstalls Virtual Audio Driver alongside SoundDome (Windows only)

!macro customInstall
  DetailPrint "Installing Virtual Audio Driver..."
  SetOutPath "$INSTDIR\driver"
  File /r "${BUILD_RESOURCES_DIR}\driver\*.*"

  ; pnputil /add-driver: installs the driver package into the Windows driver store
  ; and installs it on matching devices. Requires admin (NSIS already runs elevated).
  ; If driver is already installed with same version, pnputil reports it and exits cleanly.
  nsExec::ExecToStack 'pnputil /add-driver "$INSTDIR\driver\VirtualAudioDriver.inf" /install'
  Pop $0  ; exit code
  Pop $1  ; output

  ${If} $0 == 0
    DetailPrint "Virtual Audio Driver installed successfully"
  ${Else}
    DetailPrint "Virtual Audio Driver: pnputil returned code $0"
    DetailPrint "$1"
    MessageBox MB_OK|MB_ICONINFORMATION \
      "Virtual Audio Driver could not be installed automatically.$\r$\n$\r$\n\
      SoundDome will still work if you have VB-CABLE installed.$\r$\n\
      You can also try installing the driver manually from:$\r$\n\
      $INSTDIR\driver"
  ${EndIf}
!macroend

!macro customUnInstall
  ${If} ${FileExists} "$INSTDIR\driver\VirtualAudioDriver.inf"
    DetailPrint "Removing Virtual Audio Driver..."

    ; Use PowerShell to find the OEM inf name assigned by Windows and remove it.
    ; pnputil /enum-drivers lists all third-party drivers. We parse the output
    ; to find which oemXX.inf corresponds to VirtualAudioDriver.inf, then delete it.
    nsExec::ExecToStack 'powershell -NoProfile -ExecutionPolicy Bypass -Command "\
      $$oem = $null; \
      foreach ($$line in (pnputil /enum-drivers) -split [char]10) { \
        if ($$line -match '"'"'Published Name\s*:\s*(oem\d+\.inf)'"'"') { $$oem = $$Matches[1] } \
        if ($$line -match '"'"'Original Name\s*:.*VirtualAudioDriver\.inf'"'"' -and $$oem) { \
          pnputil /delete-driver $$oem /uninstall /force; \
          break \
        } \
      }"'
    Pop $0
    Pop $1
    DetailPrint "Driver removal: exit code $0"

    ; Clean up driver files from install directory
    RMDir /r "$INSTDIR\driver"
  ${EndIf}
!macroend
