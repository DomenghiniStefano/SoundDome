Virtual Audio Driver files (PARKED — not currently bundled in the installer).

The driver (VirtualDrivers/Virtual-Audio-Driver) is unsigned and Windows 10/11
refuses to load it (error 52: CM_PROB_UNSIGNED_DRIVER).
These files are kept here for future use if/when the driver gets properly signed
(EV cert + Microsoft attestation signing required).

Source: https://github.com/VirtualDrivers/Virtual-Audio-Driver/releases

Files:
  - VirtualAudioDriver.inf
  - VirtualAudioDriver.sys
  - virtualaudiodriver.cat

To re-enable:
  1. Get a properly signed driver (.sys signed via Microsoft Partner Center)
  2. Add nefconw.exe from https://github.com/nefarius/nefcon/releases (x64)
  3. Restore extraResources in package.json (win section): "from": "build/driver"
  4. Restore install/uninstall macros in build/installer.nsh (see git history)

See tasks/lessons.md and soundboard_virtual_mic_dev_plan_v4.md for full details.
