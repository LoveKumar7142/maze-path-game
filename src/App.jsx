// src/App.jsx
// --- FULL UPDATED PREMIUM UI VERSION ---
// (Same code I generated earlier, clean & ready to paste)

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { generateMaze } from "./maze";
import { createBGM } from "./audio";
import { collides } from "./game";
import { bfsPath } from "./pathfinding";
import Controller from "./Controller";
import "./styles.css";

export default function App() {
  const mountRef = useRef(null);
  const zoomRef = useRef(false);

  const [bgmOn, setBgmOn] = useState(true);
  const [gameOver, setGameOver] = useState(false);
  const [levelComplete, setLevelComplete] = useState(false);
  const [level, setLevel] = useState(1);
  const [timeTaken, setTimeTaken] = useState(0);
  const [sessionKey, setSessionKey] = useState(0);
  const [showStart, setShowStart] = useState(true);
  const [showHUD, setShowHUD] = useState(true);

  const keysRef = useRef({});
  const bgmRef = useRef(null);
  const gameOverRef = useRef(false);
  const levelCompleteRef = useRef(false);
  const animRef = useRef(null);
  const rendererRef = useRef(null);
  const pausedRef = useRef(false);

  useEffect(() => {
    gameOverRef.current = gameOver;
    if (gameOver) {
      try {
        bgmRef.current && bgmRef.current.pause();
      } catch {}
      if (animRef.current) cancelAnimationFrame(animRef.current);
    }
  }, [gameOver]);

  useEffect(() => {
    levelCompleteRef.current = levelComplete;
    if (levelComplete) {
      try {
        bgmRef.current && bgmRef.current.pause();
      } catch {}
      if (animRef.current) cancelAnimationFrame(animRef.current);
    }
  }, [levelComplete]);

  useEffect(() => {
    if (!bgmRef.current) bgmRef.current = createBGM();
    try {
      bgmRef.current.loop = true;
      bgmRef.current.volume = 0.32;
      if (bgmOn && !gameOverRef.current && !levelCompleteRef.current)
        bgmRef.current.play().catch(() => {});
      else bgmRef.current.pause();
    } catch {}
  }, [bgmOn]);

  useEffect(() => {
    function handleVisibility() {
      if (document.hidden) {
        pausedRef.current = true;
        if (animRef.current) cancelAnimationFrame(animRef.current);
        try {
          bgmRef.current && bgmRef.current.pause();
        } catch {}
      } else {
        pausedRef.current = false;
        try {
          if (bgmOn && !gameOverRef.current && !levelCompleteRef.current)
            bgmRef.current && bgmRef.current.play().catch(() => {});
        } catch {}
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [bgmOn]);

  // ======================================================
  // Main THREE.js Scene Setup
  // ======================================================

  useEffect(() => {
    gameOverRef.current = false;
    levelCompleteRef.current = false;
    setGameOver(false);
    setLevelComplete(false);
    setTimeTaken(0);

    let renderer, scene, camera;
    let last = performance.now();

    const maze = generateMaze(10, 10, level + sessionKey);

    function getRandomExit(m) {
      const side = Math.floor(Math.random() * 4);
      let x, z;
      if (side === 0) {
        x = Math.floor(Math.random() * m.w);
        z = 0;
      } else if (side === 1) {
        x = Math.floor(Math.random() * m.w);
        z = m.h - 1;
      } else if (side === 2) {
        x = 0;
        z = Math.floor(Math.random() * m.h);
      } else {
        x = m.w - 1;
        z = Math.floor(Math.random() * m.h);
      }
      return { side, x, z };
    }

    const exit = getRandomExit(maze);
    const exitCell = maze.grid[exit.z][exit.x];
    if (exit.side === 0) exitCell.walls[0] = 0;
    if (exit.side === 1) exitCell.walls[2] = 0;
    if (exit.side === 2) exitCell.walls[3] = 0;
    if (exit.side === 3) exitCell.walls[1] = 0;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x071022);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    rendererRef.current = renderer;

    function getMountSize() {
      if (!mountRef.current)
        return {
          w: window.innerWidth,
          h: Math.min(window.innerHeight - 140, 760),
        };
      const rect = mountRef.current.getBoundingClientRect();
      return {
        w: Math.max(1, Math.floor(rect.width)),
        h: Math.max(1, Math.floor(rect.height)),
      };
    }

    const { w, h } = getMountSize();
    renderer.setSize(w, h, false);
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";

    if (mountRef.current) {
      const prev = mountRef.current.querySelector("canvas");
      if (prev) mountRef.current.removeChild(prev);
      mountRef.current.appendChild(renderer.domElement);
    }

    camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 1000);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.2));
    const dir = new THREE.DirectionalLight(0xffffff, 0.6);
    dir.position.set(5, 10, 7);
    scene.add(dir);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(maze.w, maze.h),
      new THREE.MeshStandardMaterial({ color: 0x111218, roughness: 0.95 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(maze.w / 2, 0, maze.h / 2);
    scene.add(floor);

    const createdObjects = [];
    function addWall(x, z, sx, sz) {
      const geo = new THREE.BoxGeometry(sx, 1, sz);
      const mat = new THREE.MeshStandardMaterial({ color: 0x6b4bd6 });
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, 0.5, z);
      scene.add(m);
      createdObjects.push(m);
      return m;
    }

    maze.grid.forEach((row, rz) => {
      row.forEach((cell, rx) => {
        if (cell.walls[0]) addWall(rx + 0.5, rz, 1, 0.1);
        if (cell.walls[1]) addWall(rx + 1, rz + 0.5, 0.1, 1);
        if (cell.walls[2]) addWall(rx + 0.5, rz + 1, 1, 0.1);
        if (cell.walls[3]) addWall(rx, rz + 0.5, 0.1, 1);
      });
    });

    const player = new THREE.Vector3(0.5, 0.5, 0.5);
    const playerMesh = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 1, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x00aaff })
    );
    playerMesh.position.set(player.x, 0.5, player.z);
    scene.add(playerMesh);
    createdObjects.push(playerMesh);

    const gate = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 1.4, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x22c55e })
    );
    gate.position.set(exit.x + 0.5, 0.7, exit.z + 0.5);
    scene.add(gate);
    createdObjects.push(gate);

    const mainPath = bfsPath(maze, { x: 0, z: 0 }, { x: exit.x, z: exit.z });
    const mainPathSet = new Set(mainPath.map((p) => `${p.x},${p.z}`));

    function isRoomCell(m, x, z) {
      if (x < 0 || z < 0 || x >= m.w || z >= m.h) return false;
      const c = m.grid[z][x];
      const open = c.walls.reduce((s, w) => s + (w === 0 ? 1 : 0), 0);
      return open >= 2;
    }

    function spawnZombieRoomSafe(m, mainSet) {
      const attempts = m.w * m.h * 3;
      for (let i = 0; i < attempts; i++) {
        const x = Math.floor(Math.random() * m.w);
        const z = Math.floor(Math.random() * m.h);
        const key = `${x},${z}`;
        if (!isRoomCell(m, x, z)) continue;
        if (mainSet.has(key)) continue;
        if (
          mainSet.has(`${x + 1},${z}`) ||
          mainSet.has(`${x - 1},${z}`) ||
          mainSet.has(`${x},${z + 1}`) ||
          mainSet.has(`${x},${z - 1}`)
        )
          continue;
        if (Math.hypot(x - 0, z - 0) < 5) continue;
        if (Math.hypot(x - exit.x, z - exit.z) < 4) continue;
        return { x, z };
      }
      for (let zz = 0; zz < m.h; zz++)
        for (let xx = 0; xx < m.w; xx++) {
          const k = `${xx},${zz}`;
          if (
            !mainSet.has(k) &&
            isRoomCell(m, xx, zz) &&
            Math.hypot(xx - 0, zz - 0) > 5
          )
            return { x: xx, z: zz };
        }
      return { x: Math.max(1, m.w - 2), z: Math.max(1, m.h - 2) };
    }

    function canSeePlayer(zmesh, player) {
      const zx = Math.floor(zmesh.position.x),
        zz = Math.floor(zmesh.position.z);
      const px = Math.floor(player.x),
        pz = Math.floor(player.z);
      const maxLOS = 8;
      if (Math.hypot(px - zx, pz - zz) > maxLOS) return false;

      let x0 = zx,
        y0 = zz,
        x1 = px,
        y1 = pz;
      let dx = Math.abs(x1 - x0),
        dy = Math.abs(y1 - y0);
      let sx = x0 < x1 ? 1 : -1,
        sy = y0 < y1 ? 1 : -1;
      let err = dx - dy;
      while (true) {
        if (x0 === x1 && y0 === y1) break;
        const e2 = err * 2;
        let nx = x0,
          ny = y0;
        if (e2 > -dy) {
          err -= dy;
          nx = x0 + sx;
        }
        if (e2 < dx) {
          err += dx;
          ny = y0 + sy;
        }
        if (nx === x0 + 1 && ny === y0) {
          if (maze.grid[y0][x0].walls[1] === 1) return false;
        } else if (nx === x0 - 1 && ny === y0) {
          if (maze.grid[y0][x0].walls[3] === 1) return false;
        } else if (ny === y0 + 1 && nx === x0) {
          if (maze.grid[y0][x0].walls[2] === 1) return false;
        } else if (ny === y0 - 1 && nx === x0) {
          if (maze.grid[y0][x0].walls[0] === 1) return false;
        }
        x0 = nx;
        y0 = ny;
      }
      return true;
    }

    const zombies = [];
    const zcount = Math.max(2, Math.floor((maze.w * maze.h) / 90));
    for (let i = 0; i < zcount; i++) {
      const p = spawnZombieRoomSafe(maze, mainPathSet);
      const zm = new THREE.Mesh(
        new THREE.BoxGeometry(0.6, 1, 0.6),
        new THREE.MeshStandardMaterial({ color: 0xff3333 })
      );
      zm.position.set(p.x + 0.5, 0.5, p.z + 0.5);
      zm.userData = {
        state: "roam",
        path: [],
        chaseTimer: 0,
        think: Math.random() * 1.5,
      };
      scene.add(zm);
      zombies.push(zm);
      createdObjects.push(zm);
    }

    function down(e) {
      keysRef.current[e.code] = true;
    }
    function up(e) {
      keysRef.current[e.code] = false;
    }
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);

    function updateMovement(delta) {
      const keys = keysRef.current;
      let nx = player.x,
        nz = player.z;
      const speed = 2.6 * delta;
      if (keys["KeyW"] || keys["ArrowUp"]) nz -= speed;
      if (keys["KeyS"] || keys["ArrowDown"]) nz += speed;
      if (keys["KeyA"] || keys["ArrowLeft"]) nx -= speed;
      if (keys["KeyD"] || keys["ArrowRight"]) nx += speed;

      if (!collides(nx, player.z, maze)) player.x = nx;
      if (!collides(player.x, nz, maze)) player.z = nz;

      playerMesh.position.set(player.x, 0.5, player.z);
    }

    function updateZombies(delta) {
      for (const z of zombies) {
        const zx = Math.floor(z.position.x),
          zz = Math.floor(z.position.z);
        const zkey = `${zx},${zz}`;

        if (mainPathSet.has(zkey)) {
          z.position.x = zx + 0.5;
          z.position.z = zz + 0.5;
          z.userData.state = "roam";
          z.userData.path = [];
          z.userData.chaseTimer = 0;
          continue;
        }

        const sees = canSeePlayer(z, player);

        if (sees) {
          z.userData.chaseTimer = (z.userData.chaseTimer || 0) + delta;
          z.userData.state = "chase";
          z.userData.think -= delta;
          if (
            !z.userData.path ||
            z.userData.path.length === 0 ||
            z.userData.think <= 0
          ) {
            z.userData.think = 0.8 + Math.random() * 0.8;
            const path = bfsPath(
              maze,
              { x: zx, z: zz },
              { x: Math.floor(player.x), z: Math.floor(player.z) }
            );
            z.userData.path = path
              .filter((node) => !mainPathSet.has(`${node.x},${node.z}`))
              .slice(0, 8);
          }

          if (
            z.userData.chaseTimer <= 5 &&
            z.userData.path &&
            z.userData.path.length > 0
          ) {
            const next = z.userData.path[0];
            const tx = next.x + 0.5,
              tz = next.z + 0.5;
            const dx = tx - z.position.x,
              dz = tz - z.position.z;
            const dist = Math.hypot(dx, dz);
            if (dist > 0.06) {
              const step = 1.0 * delta;
              const nx = z.position.x + (dx / dist) * step;
              const nz = z.position.z + (dz / dist) * step;
              if (!collides(nx, nz, maze)) {
                z.position.x = nx;
                z.position.z = nz;
              } else {
                z.userData.path = [];
                z.userData.state = "confused";
                z.userData.chaseTimer = 0;
              }
            } else z.userData.path.shift();
            continue;
          } else {
            z.userData.state = "confused";
            z.userData.chaseTimer = 0;
            z.userData.path = [];
            z.userData.think = 0.6 + Math.random();
            continue;
          }
        }

        if (z.userData.state === "chase") {
          z.userData.state = "confused";
          z.userData.chaseTimer = 0;
          z.userData.path = [];
          z.userData.think = 0.6 + Math.random();
        }

        if (z.userData.state === "confused") {
          z.userData.think -= delta;
          if (z.userData.think <= 0) {
            const dirs = [
              { dx: 0, dz: -1 },
              { dx: 1, dz: 0 },
              { dx: 0, dz: 1 },
              { dx: -1, dz: 0 },
            ];
            for (let t = 0; t < 6; t++) {
              const d = dirs[Math.floor(Math.random() * dirs.length)];
              const nx = Math.max(0, Math.min(maze.w - 1, zx + d.dx));
              const nz = Math.max(0, Math.min(maze.h - 1, zz + d.dz));
              if (!mainPathSet.has(`${nx},${nz}`) && isRoomCell(maze, nx, nz)) {
                z.userData.path = [{ x: nx, z: nz }];
                break;
              }
            }
            z.userData.think = 0.8 + Math.random() * 1.2;
          }
          if (z.userData.path && z.userData.path.length > 0) {
            const next = z.userData.path[0];
            const tx = next.x + 0.5,
              tz = next.z + 0.5;
            const dx = tx - z.position.x,
              dz = tz - z.position.z;
            const dist = Math.hypot(dx, dz);
            if (dist > 0.06) {
              const step = 0.45 * delta;
              const nx = z.position.x + (dx / dist) * step;
              const nz = z.position.z + (dz / dist) * step;
              if (!collides(nx, nz, maze)) {
                z.position.x = nx;
                z.position.z = nz;
              } else {
                z.userData.path = [];
                z.userData.state = "roam";
              }
            } else {
              z.userData.path.shift();
              if (z.userData.path.length === 0) z.userData.state = "roam";
            }
            continue;
          } else z.userData.state = "roam";
        }

        if (z.userData.state === "roam") {
          z.userData.think -= delta;
          if (z.userData.think <= 0) {
            z.userData.think = 1.6 + Math.random() * 2.4;
            let found = false;
            for (let t = 0; t < 12 && !found; t++) {
              const rx = Math.max(
                0,
                Math.min(maze.w - 1, zx + Math.floor((Math.random() - 0.5) * 6))
              );
              const rz = Math.max(
                0,
                Math.min(maze.h - 1, zz + Math.floor((Math.random() - 0.5) * 6))
              );
              if (!mainPathSet.has(`${rx},${rz}`) && isRoomCell(maze, rx, rz)) {
                z.userData.path = [{ x: rx, z: rz }];
                found = true;
              }
            }
            if (!found) z.userData.path = [];
          }
          if (z.userData.path && z.userData.path.length > 0) {
            const next = z.userData.path[0];
            const tx = next.x + 0.5,
              tz = next.z + 0.5;
            const dx = tx - z.position.x,
              dz = tz - z.position.z;
            const dist = Math.hypot(dx, dz);
            const step = 0.3 * delta;
            if (dist > 0.06) {
              const nx = z.position.x + (dx / dist) * step;
              const nz = z.position.z + (dz / dist) * step;
              if (!collides(nx, nz, maze)) {
                z.position.x = nx;
                z.position.z = nz;
              } else z.userData.path = [];
            } else z.userData.path.shift();
          }
        }

        if (collides(z.position.x, z.position.z, maze)) {
          z.position.x = zx + 0.5;
          z.position.z = zz + 0.5;
        }

        if (
          !gameOverRef.current &&
          Math.hypot(player.x - z.position.x, player.z - z.position.z) < 0.45
        ) {
          setGameOver(true);
        }
      }
    }

    function animate() {
      animRef.current = requestAnimationFrame(animate);
      const now = performance.now();
      const delta = (now - last) / 1000;
      last = now;

      if (!gameOverRef.current && !levelCompleteRef.current) {
        updateMovement(delta);
        updateZombies(delta);
        setTimeTaken((t) => t + delta);
      }

      if (zoomRef.current) {
        camera.position.set(
          maze.w / 2,
          Math.max(maze.w, maze.h) * 1.1,
          maze.h / 2
        );
        camera.rotation.set(-Math.PI / 2, 0, 0);
      } else {
        camera.position.set(player.x, 1.6, player.z + 1.6);
        camera.lookAt(player.x, 0.5, player.z);
      }

      const dx = player.x - (exit.x + 0.5);
      const dz = player.z - (exit.z + 0.5);
      if (
        !levelCompleteRef.current &&
        !gameOverRef.current &&
        Math.hypot(dx, dz) < 0.55
      ) {
        setLevelComplete(true);
      }

      renderer.render(scene, camera);
    }

    animate();

    function handleResize() {
      if (!mountRef.current || !renderer || !camera) return;
      const rect = mountRef.current.getBoundingClientRect();
      const nw = Math.max(1, Math.floor(rect.width));
      const nh = Math.max(1, Math.floor(rect.height));
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(nw, nh, false);
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
    }

    window.addEventListener("resize", handleResize);
    setTimeout(handleResize, 50);

    return () => {
      try {
        if (animRef.current) cancelAnimationFrame(animRef.current);
      } catch {}
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("resize", handleResize);

      try {
        scene.traverse((obj) => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) {
            if (Array.isArray(obj.material)) {
              obj.material.forEach((m) => {
                if (m.map) m.map.dispose();
                m.dispose();
              });
            } else {
              if (obj.material.map) obj.material.map.dispose();
              obj.material.dispose();
            }
          }
        });
      } catch (e) {}

      try {
        if (
          mountRef.current &&
          renderer &&
          mountRef.current.contains(renderer.domElement)
        )
          mountRef.current.removeChild(renderer.domElement);
        renderer.dispose();
      } catch (e) {}
      rendererRef.current = null;
    };
  }, [level, sessionKey]);

  function handleNextLevel() {
    setLevel((l) => l + 1);
    setLevelComplete(false);
    setGameOver(false);
    setTimeTaken(0);
  }
  function handleRestart() {
    setSessionKey((s) => s + 1);
  }
  function handleToggleMusic() {
    setBgmOn((v) => !v);
  }
  function handleToggleZoom(to) {
    zoomRef.current = to;
  }
  function handleSolvePath() {
    zoomRef.current = true;
    setTimeout(() => (zoomRef.current = false), 2200);
  }
  function handleControlTouch(key, isDown) {
    const map = {
      ArrowUp: "KeyW",
      ArrowLeft: "KeyA",
      ArrowDown: "KeyS",
      ArrowRight: "KeyD",
    };
    const code = map[key] || key;
    keysRef.current[code] = !!isDown;
  }
  function handleFullscreen() {
    try {
      if (mountRef.current) {
        if (!document.fullscreenElement) mountRef.current.requestFullscreen();
        else document.exitFullscreen();
      }
    } catch {}
  }

  // ======================================================
  // RETURN UI
  // ======================================================

  return (
    <div className="app-shell">
      <div className="canvas-card">
        <header className="canvas-topbar">
          <div className={`${showHUD ? "title" : ""}`}>
            <div className="logo">MZ</div>
            <div>
              <h1 className="brand">Maze Path</h1>
              <div className="small muted">3D Maze Navigator — polished UI</div>
            </div>
          </div>

          <div className="top-actions">
            <button
              className="btn ghost"
              onClick={() =>
                window.open(
                  "https://maze-path.netlify.app/",
                  "_blank",
                  "noopener"
                )
              }
            >
              Live Demo
            </button>
            <button className="btn ghost" onClick={handleFullscreen}>
              Fullscreen
            </button>
            <button
              className="btn ghost"
              onClick={() =>
                navigator.clipboard?.writeText(window.location.href)
              }
            >
              Share
            </button>
          </div>
        </header>

        <div className="mount" ref={mountRef} id="three-mount" />

        {showHUD && (
          <div className="hud-panel">
            <div className="hud-left" style={{width: "20%"}}>
              <div className="hud-item">
                Level <strong>{level}</strong>
              </div>
              <div className="hud-item">
                Time <strong>{timeTaken.toFixed(2)}s</strong>
              </div>
            </div>

            <div className="hud-center">
              <button className="btn neon" onClick={handleSolvePath} style={{marginRight:"10px"}}>
                Solve
              </button>
              <button className="btn neon" onClick={handleRestart}>
                Restart
              </button>
            </div>

            <div className="hud-right">
              <button className="btn icon" style={{marginRight:"10px"}} onClick={handleToggleMusic}>
                {bgmOn ? "🔊" : "🔈"}
              </button>
              <button
                className="btn icon"
                onClick={() => setShowHUD((s) => !s)}
              >
                {showHUD ? "Hide" : "HUD"}
              </button>
            </div>
          </div>
        )}

        <Controller
          onRestart={handleRestart}
          onToggleMusic={handleToggleMusic}
          onSolve={handleSolvePath}
          onToggleZoom={handleToggleZoom}
          onFullscreen={handleFullscreen}
          onControl={handleControlTouch}
          isMusicOn={bgmOn}
        />

        {showStart && (
          <div className="start-modal">
            <div className="start-card">
              <h2>Maze Path</h2>
              <p className="small">
                Premium dark UI — use WASD or arrows to navigate. Mobile
                controls available.
              </p>
              <div className="start-actions">
                <button
                  className="btn primary"
                  onClick={() => {
                    setShowStart(false);
                    setSessionKey((s) => s + 1);
                  }}
                >
                  Play Game
                </button>
                <button
                  className="btn ghost"
                  onClick={() => setShowStart(false)}
                >
                  Play (No sound)
                </button>
              </div>
              <div className="small muted" style={{ marginTop: 12 }}>
                Tip: Click Solve to briefly show top-down view.
              </div>
            </div>
          </div>
        )}
      </div>

      <aside className="sidebar">
        <div className="status-row">
          <div>
            <div className="small">Status</div>
            <h3>
              {gameOver
                ? "Game Over"
                : levelComplete
                ? "Level Complete"
                : "Playing"}
            </h3>
          </div>
          <div style={{ textAlign: "right", display:"flex", justifyContent:"center"}}>
            <div className="small">Level &nbsp;</div>
            <div style={{ fontWeight: 700 }}>{level}</div>
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <div className="stat">
            <div className="label">Time</div>
            <div className="value">{timeTaken.toFixed(2)}s</div>
          </div>

          <div className="stat">
            <div className="label">State</div>
            <div className="value">
              {gameOver ? "Dead" : levelComplete ? "Complete" : "Alive"}
            </div>
          </div>

          <div className="stat">
            <div className="label">BGM</div>
            <div className="value">{bgmOn ? "On" : "Off"}</div>
          </div>
        </div>

        <div style={{ marginTop: 14 }}>
          <div className="small">Tips</div>
          <ul style={{ paddingLeft: 18, marginTop: 8 }}>
            <li className="small">Use Arrow keys / WASD to move</li>
            <li className="small">Tap buttons for mobile controls</li>
            <li className="small">Click Solve to briefly show top-down</li>
          </ul>
        </div>

        <div style={{ marginTop: 18, display: "flex", gap: 8 }}>
          <button className="btn primary" onClick={handleRestart}>
            Restart
          </button>
          <button className="btn" onClick={handleNextLevel}>
            Next Level
          </button>
        </div>
        {/* <div className="minimap" aria-hidden>
          <div className="small">Mini Map</div>
        </div> */}
      </aside>

      {gameOver && (
        <div className="overlay-screen">
          <div className="overlay-card">
            <h2 className="overlay-title">💀 GAME OVER</h2>
            <div style={{ marginTop: 12 }}>
              <button className="btn primary" onClick={handleRestart}>
                Try Again
              </button>
            </div>
          </div>
        </div>
      )}

      {levelComplete && (
        <div className="overlay-screen">
          <div className="overlay-card">
            <h2 className="overlay-title">🎉 LEVEL COMPLETE 🎉</h2>
            <div style={{ fontSize: 18, marginTop: 10 }}>
              Time: {timeTaken.toFixed(2)}s
            </div>
            <div
              style={{
                marginTop: 16,
                display: "flex",
                gap: 8,
              }}
            >
              <button className="btn primary" onClick={handleNextLevel}>
                Next Level
              </button>
              <button className="btn" onClick={handleRestart}>
                Restart
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
