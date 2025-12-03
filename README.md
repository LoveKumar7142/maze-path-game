
# 🧩 3D Maze Escape – Zombie Survival Game (Three.js + React)
### 🎮 Find the exit, avoid zombies, complete levels!

🚀 A fully interactive **3D Maze Escape Game** built using **React + Three.js**, featuring:  
✔ Randomly generated maze  
✔ Dynamic exit gate  
✔ Smart zombies with roaming & chasing AI  
✔ Collision + pathfinding  
✔ 3D ↔ 2D top-view camera toggle  
✔ Level progression  
✔ Background music  
✔ Clean UI overlays  

🎯 **Live Demo:**  
👉 https://maze-path.netlify.app/

---

## 📌 Features

### 🔹 🎲 Random Maze Generation
- Every level creates a new maze using DFS-based generator  
- Extra escape paths for fair gameplay  

### 🔹 🚪 Random Exit Gate
- The exit is always placed on the maze boundary  
- A small wall opening is created for the player  

### 🔹 🧟 Intelligent Zombie AI
Zombies can:
- Wander inside rooms  
- Detect the player  
- Chase if they see you  
- Get confused & change direction randomly  
- Respect walls (no clipping)  

### 🔹 🧍 Smooth Player Movement
- **WASD** for movement  
- Realistic collision system  
- No wall clipping  
- Smooth 3D navigation  

### 🔹 📷 Adjustable Camera
- **3D Third-person camera**
- **2D top-down tactical camera**

### 🔹 🎵 Background Music
- Toggle **mute/unmute** anytime from UI  

### 🔹 🎉 Level System
- Level completion screen  
- Timer  
- Restart / Next level / Exit  

---

## 🖼️ Screenshots

<p align="center">
  <img src="./assets/img1.png" width="600">
</p>
<p align="center">
  <img src="./assets/img2.png" width="600">
</p>

---

## 💻 Tech Stack

| Technology | Purpose |
|-----------|----------|
| **React** | UI + state handling |
| **Three.js** | 3D rendering engine |
| **Vite** | fast development server |
| **Custom BFS** | path-finding & safe-path logic |
| **DFS Maze Generator** | maze creation |

---

## 📁 Folder Structure

```
    src/
    │── App.jsx
    │── maze.js
    │── game.js
    │── pathfinding.js
    │── audio.js
    │── index.css
    └── main.jsx
```


---

## ⚙️ How to Run Locally

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO
npm install
npm run dev

```

---

## ⚙️ Installation & Run Locally

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
cd YOUR_REPO
npm install
npm run dev

