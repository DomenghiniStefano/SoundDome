# MINI SOUNDBOARD MVP -- Electron (Windows)

## 🎯 Obiettivo

Creare una mini-versione desktop Windows di una soundboard usando
Electron che:

-   Ha UN solo bottone
-   Riproduce un file MP3 locale precaricato
-   Permette di scegliere se inviare l'audio:
    -   alle cuffie (output normale)
    -   al microfono virtuale (VB-CABLE)
    -   ad entrambi
-   Usa due boolean toggle sopra al bottone:
    -   sendToSpeakers
    -   sendToVirtualMic

Questa versione serve SOLO a validare:

1.  Riproduzione MP3 locale
2.  Routing verso dispositivo audio selezionato
3.  Funzionamento in Discord / Zoom
4.  Stabilità setSinkId()

------------------------------------------------------------------------

# 🖥 Target

-   OS: Windows 10/11
-   Architettura: x64

------------------------------------------------------------------------

# 🔊 Dipendenza esterna OBBLIGATORIA

Installare manualmente prima del test:

VB-CABLE Virtual Audio Device\
https://vb-audio.com/Cable/

------------------------------------------------------------------------

# 🧱 Stack Tecnologico

-   Electron (latest stable)
-   Node.js LTS
-   HTML + CSS + Vanilla JS
-   Web Audio API
-   HTMLAudioElement + setSinkId()

------------------------------------------------------------------------

# 📦 Dipendenze NPM

``` bash
npm init -y
npm install --save-dev electron
npm install electron-builder --save-dev
```

------------------------------------------------------------------------

# 📁 Struttura Progetto

mini-soundboard/ │ ├── package.json ├── main.js ├── preload.js ├──
index.html ├── renderer.js ├── assets/ │ └── sound.mp3 └── config.json
(creato runtime)

------------------------------------------------------------------------

# 🧪 Piano Test

## Test 1 -- Speakers Only

-   sendToSpeakers = true
-   sendToVirtualMic = false
-   Deve sentirsi nelle cuffie

## Test 2 -- Virtual Mic Only

-   sendToSpeakers = false
-   sendToVirtualMic = true
-   In Discord selezionare Microphone: CABLE Output
-   Deve sentirsi in call

## Test 3 -- Entrambi

-   true / true
-   Deve sentirsi sia localmente che in Discord

------------------------------------------------------------------------

# 🎯 Obiettivo Strategico

Verificare:

"Possiamo controllare l'output audio verso un microfono virtuale usando
Electron?"

Se sì → si costruisce sopra.
