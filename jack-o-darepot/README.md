# 🎃 JACK’O POT

> *“Spin the reels. Face the dare.”*

Welcome to **JACK’O POT** — a haunted slot machine that decides your fate.  
Press the button, watch the cursed reels spin, and see who dares to play… what… and *where*.  
Each spin brings a new player, a new horror category, and a new terrifying game to face.

---

## 🕸️ What is this?

**JACK’O POT** is a Halloween-themed web app where a slot machine randomly selects:

1. 🎭 **The Player** — Who will face the next spooky challenge  
2. 💀 **The Category** — From VR horrors to indie nightmares  
3. 👻 **The Game** — The title that seals your fate  

It’s part game, part ritual, and 100% Halloween chaos.

This is a **personal project** created to use with friends during horror game nights and spooky events.  
If you’d like to use it yourself, simply **download the project** and **edit the JSON files** to include your own players, categories, and games.

---

## ⚙️ Tech Stack

Built with the web’s dark arts:

- **Desktop Framework**: Electron
- **Frontend**: React 19 + Vite 7 + Framer Motion + Howler.js
- **CSS animations & sound effects** for haunted slot machine atmosphere
- **Native OS APIs**: System notifications, native file pickers, window controls, and shell integration

---

## 🧩 Features

- 🕹️ Interactive slot machine animation  
- ⏱️ Sequential reel stopping for suspense  
- 💡 Randomized combinations of players, categories, and games  
- 🔊 Optional spooky sound effects and ambient background  
- 🎃 Perfect for Halloween parties, Twitch streams, or dare nights  
- ☠️ **Cursed Mode** — the machine might whisper back… or choose something you *didn’t* add
- 🖥️ **Standalone Desktop App (Electron)**:
  - 🔔 Native OS Notifications on dare outcomes and cursed reel triggers
  - 🔊 Native system audio beeps and alerts
  - 📂 Direct File Dialogs to import custom player lists or games from your disk
  - 🗂️ Quick access to local User Data directory
  - 🖥️ Fullscreen toggle for party/stream mode and native window controls

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Run as Desktop App (Development)
Launches Vite dev server with Hot Module Replacement connected to Electron:
```bash
npm run electron:dev
```

### 3. Run as Desktop App (Production Build Preview)
Builds the production bundle and opens the standalone Electron desktop window:
```bash
npm run electron:preview
```

### 4. Run in Browser Only (Optional)
```bash
npm run dev
```
