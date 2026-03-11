; build/installer.nsh
; Custom NSIS hooks for electron-builder
;
; Virtual Audio Driver installation is DISABLED.
; The driver (VirtualDrivers/Virtual-Audio-Driver) is unsigned and Windows 10/11
; refuses to load it (error 52: CM_PROB_UNSIGNED_DRIVER).
; nefconw-based installation was tested and works correctly, but requires
; an EV Code Signing Certificate + Microsoft attestation signing (~$300/yr).
; See tasks/lessons.md and soundboard_virtual_mic_dev_plan_v4.md for details.
;
; For now, VB-CABLE remains the supported virtual audio solution on Windows.
; On Linux, a PulseAudio/PipeWire null sink is created at runtime (no driver needed).

!macro customInstall
!macroend

!macro customUnInstall
!macroend
