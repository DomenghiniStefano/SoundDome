# Lessons Learned

## Virtual Audio Driver (Windows)
- **pnputil /add-driver /install does NOT create device nodes** for software/virtual drivers — there's no physical hardware to trigger PnP enumeration. You must use devcon or nefconw to explicitly create the `ROOT\*` device node before installing the driver on it.
- **nefconw.exe** (nefarius/nefcon) is the open-source replacement for devcon, designed for installer use (no visible window, MIT-like license).
- **Driver signing is MANDATORY on Windows 10/11 64-bit** — unsigned kernel-mode drivers get error code 52 (`CM_PROB_UNSIGNED_DRIVER`). The device node is created, the driver is installed, but Windows refuses to load the `.sys` file.
- **VirtualDrivers/Virtual-Audio-Driver** claims SignPath Foundation signing, but the release we tested (downloaded from GitHub) was NOT recognized by Windows 11 (error 52). Possible causes: signature expired, not cross-signed by Microsoft, or the release wasn't the signed build.
- **To properly sign a kernel-mode driver on Windows** requires:
  1. An EV Code Signing Certificate (~$200-400/year from DigiCert, Sectigo, etc.)
  2. A Microsoft Partner Center account (formerly Hardware Dev Center)
  3. Submit the driver for **attestation signing** — Microsoft signs it with their certificate
  4. Only Microsoft-signed drivers load without test mode on stock Windows 10/11
- **Workaround for testing**: `bcdedit /set testsigning on` + reboot. Shows "Test Mode" watermark on desktop. Not acceptable for end users.
- **Current status**: nefconw installer integration works correctly (creates device node + installs driver). The blocker is driver signing, not the installer. VB-CABLE remains the working alternative since it's already properly signed.
- **No user-mode alternative exists on Windows** for creating virtual audio devices — unlike video (DirectShow virtual cameras), audio endpoints require kernel-mode WDM drivers. Every app that creates virtual audio (Voicemod, Krisp, VoiceMeeter) uses a signed kernel driver.
- **VB-CABLE licensing**: donationware, cannot be redistributed (bundled in installer) or renamed without explicit permission from VB-Audio. Linking to their site is OK. Current approach (detect + banner + link) is the best option without EV cert.
- **EV Code Signing Certificate** (~$300/year) would solve two problems: (1) sign the Virtual Audio Driver so it loads on stock Windows, (2) sign the SoundDome .exe itself to eliminate SmartScreen "Unknown Publisher" warning.

## Virtual Audio (Linux)
- **Linux virtual audio doesn't need kernel drivers** — `pactl load-module module-null-sink` is sufficient to create a virtual audio device that appears in PulseAudio/PipeWire.
- The module ID returned by `pactl load-module` must be saved for cleanup via `pactl unload-module <id>` on app quit.
- Always check for existing sinks on startup (crash recovery) to avoid creating duplicates.
