// src/App.jsx
import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { generateMaze } from "./maze";
import { createBGM } from "./audio";
import { collides } from "./game";
import { bfsPath } from "./pathfinding";

export default function App() {
  const mountRef = useRef(null);
  const zoomRef = useRef(false);

  const [bgmOn, setBgmOn] = useState(true);
  const [gameOver, setGameOver] = useState(false);
  const [levelComplete, setLevelComplete] = useState(false);
  const [level, setLevel] = useState(1);
  const [timeTaken, setTimeTaken] = useState(0);

  const keysRef = useRef({});
  const bgmRef = useRef(null);

  // refs used inside closure/loop so state changes are visible immediately
  const gameOverRef = useRef(false);
  const levelCompleteRef = useRef(false);
  const animRef = useRef(null);

  // sync refs when state changes
  useEffect(() => {
    gameOverRef.current = gameOver;
    if (gameOver) {
      // stop bgm immediately when game over
      try { bgmRef.current && bgmRef.current.pause(); } catch {}
      // cancel RAF
      if (animRef.current) cancelAnimationFrame(animRef.current);
    }
  }, [gameOver]);

  useEffect(() => {
    levelCompleteRef.current = levelComplete;
    if (levelComplete) {
      try { bgmRef.current && bgmRef.current.pause(); } catch {}
      if (animRef.current) cancelAnimationFrame(animRef.current);
    }
  }, [levelComplete]);

  // BGM setup
  useEffect(() => {
    if (!bgmRef.current) bgmRef.current = createBGM();
    try {
      bgmRef.current.loop = true;
      bgmRef.current.volume = 0.32;
      if (bgmOn && !gameOverRef.current && !levelCompleteRef.current) bgmRef.current.play().catch(()=>{});
      else bgmRef.current.pause();
    } catch {}
  }, [bgmOn]);

  // Main scene effect (recreated when level changes)
  useEffect(() => {
    // reset refs/states for new level
    gameOverRef.current = false;
    levelCompleteRef.current = false;
    setGameOver(false);
    setLevelComplete(false);
    setTimeTaken(0);

    let renderer, scene, camera;
    let last = performance.now();

    const maze = generateMaze(10, 10, level);

    // choose exit on boundary and open that wall
    function getRandomExit(maze) {
      const side = Math.floor(Math.random() * 4);
      let x, z;
      if (side === 0) { x = Math.floor(Math.random() * maze.w); z = 0; }
      else if (side === 1) { x = Math.floor(Math.random() * maze.w); z = maze.h - 1; }
      else if (side === 2) { x = 0; z = Math.floor(Math.random() * maze.h); }
      else { x = maze.w - 1; z = Math.floor(Math.random() * maze.h); }
      return { side, x, z };
    }

    const exit = getRandomExit(maze);
    // open small gate in maze grid
    const exitCell = maze.grid[exit.z][exit.x];
    if (exit.side === 0) exitCell.walls[0] = 0;
    if (exit.side === 1) exitCell.walls[2] = 0;
    if (exit.side === 2) exitCell.walls[3] = 0;
    if (exit.side === 3) exitCell.walls[1] = 0;

    // three.js init
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    mountRef.current.appendChild(renderer.domElement);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.2));
    const dir = new THREE.DirectionalLight(0xffffff, 0.6);
    dir.position.set(5, 10, 7);
    scene.add(dir);

    // floor
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(maze.w, maze.h),
      new THREE.MeshStandardMaterial({ color: 0x999999 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(maze.w/2, 0, maze.h/2);
    scene.add(floor);

    // walls visual
    function addWall(x, z, sx, sz) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(sx, 1, sz), new THREE.MeshStandardMaterial({ color: 0x663300 }));
      m.position.set(x, 0.5, z);
      scene.add(m);
      return m;
    }
    maze.grid.forEach((row, rz) => {
      row.forEach((cell, rx) => {
        if (cell.walls[0]) addWall(rx+0.5, rz, 1, 0.1);
        if (cell.walls[1]) addWall(rx+1, rz+0.5, 0.1, 1);
        if (cell.walls[2]) addWall(rx+0.5, rz+1, 1, 0.1);
        if (cell.walls[3]) addWall(rx, rz+0.5, 0.1, 1);
      });
    });

    // player
    const player = new THREE.Vector3(0.5, 0.5, 0.5);
    const playerMesh = new THREE.Mesh(new THREE.BoxGeometry(0.6,1,0.6), new THREE.MeshStandardMaterial({ color: 0x00aaff }));
    playerMesh.position.set(player.x, 0.5, player.z);
    scene.add(playerMesh);

    // exit gate model
    const gate = new THREE.Mesh(new THREE.BoxGeometry(0.8,1.4,0.2), new THREE.MeshStandardMaterial({ color: "green" }));
    gate.position.set(exit.x + 0.5, 0.7, exit.z + 0.5);
    scene.add(gate);

    // main safe path
    const mainPath = bfsPath(maze, { x: 0, z: 0 }, { x: exit.x, z: exit.z });
    const mainPathSet = new Set(mainPath.map(p => `${p.x},${p.z}`));

    // helper isRoom
    function isRoomCell(maze, x, z) {
      if (x < 0 || z < 0 || x >= maze.w || z >= maze.h) return false;
      const c = maze.grid[z][x];
      const open = c.walls.reduce((s,w)=> s + (w===0?1:0), 0);
      return open >= 2;
    }

    // spawn zombies only in rooms & not near main path
    function spawnZombieRoomSafe(maze, mainSet) {
      const attempts = maze.w * maze.h * 3;
      for (let i=0;i<attempts;i++) {
        const x = Math.floor(Math.random()*maze.w);
        const z = Math.floor(Math.random()*maze.h);
        const key = `${x},${z}`;
        if (!isRoomCell(maze,x,z)) continue;
        if (mainSet.has(key)) continue;
        if (mainSet.has(`${x+1},${z}`) || mainSet.has(`${x-1},${z}`) || mainSet.has(`${x},${z+1}`) || mainSet.has(`${x},${z-1}`)) continue;
        if (Math.hypot(x-0, z-0) < 5) continue;
        if (Math.hypot(x-exit.x, z-exit.z) < 4) continue;
        return { x, z };
      }
      // fallback scan
      for (let zz=0; zz<maze.h; zz++) for (let xx=0; xx<maze.w; xx++) {
        const k = `${xx},${zz}`;
        if (!mainSet.has(k) && isRoomCell(maze, xx, zz) && Math.hypot(xx-0, zz-0) > 5) return { x: xx, z: zz };
      }
      return { x: Math.max(1,maze.w-2), z: Math.max(1, maze.h-2) };
    }

    // simple LOS grid check (stepping between cells and ensure wall between cells is open)
    function canSeePlayer(zmesh, player) {
      const zx = Math.floor(zmesh.position.x), zz = Math.floor(zmesh.position.z);
      const px = Math.floor(player.x), pz = Math.floor(player.z);
      const maxLOS = 8;
      if (Math.hypot(px - zx, pz - zz) > maxLOS) return false;

      // Bresenham-ish step
      let x0 = zx, y0 = zz, x1 = px, y1 = pz;
      let dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
      let sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
      let err = dx - dy;
      while (true) {
        if (x0 === x1 && y0 === y1) break;
        const e2 = err*2;
        let nx = x0, ny = y0;
        if (e2 > -dy) { err -= dy; nx = x0 + sx; }
        if (e2 < dx) { err += dx; ny = y0 + sy; }
        // moved from (x0,y0) to (nx,ny): check wall between them
        if (nx === x0 + 1 && ny === y0) { if (maze.grid[y0][x0].walls[1] === 1) return false; }
        else if (nx === x0 - 1 && ny === y0) { if (maze.grid[y0][x0].walls[3] === 1) return false; }
        else if (ny === y0 + 1 && nx === x0) { if (maze.grid[y0][x0].walls[2] === 1) return false; }
        else if (ny === y0 - 1 && nx === x0) { if (maze.grid[y0][x0].walls[0] === 1) return false; }
        x0 = nx; y0 = ny;
      }
      return true;
    }

    // zombies array
    const zombies = [];
    const zcount = Math.max(2, Math.floor((maze.w * maze.h) / 90));
    for (let i=0;i<zcount;i++) {
      const p = spawnZombieRoomSafe(maze, mainPathSet);
      const zm = new THREE.Mesh(new THREE.BoxGeometry(0.6,1,0.6), new THREE.MeshStandardMaterial({ color: 0xff3333 }));
      zm.position.set(p.x + 0.5, 0.5, p.z + 0.5);
      zm.userData = { state: "roam", path: [], chaseTimer: 0, think: Math.random()*1.5 };
      scene.add(zm);
      zombies.push(zm);
    }

    // keyboard handlers
    function down(e) { keysRef.current[e.code] = true; }
    function up(e) { keysRef.current[e.code] = false; }
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);

    // move player with collision check (grid collision function used)
    function updateMovement(delta) {
      const keys = keysRef.current;
      let nx = player.x, nz = player.z;
      const speed = 2.6 * delta;
      if (keys["KeyW"]) nz -= speed;
      if (keys["KeyS"]) nz += speed;
      if (keys["KeyA"]) nx -= speed;
      if (keys["KeyD"]) nx += speed;

      if (!collides(nx, player.z, maze)) player.x = nx;
      if (!collides(player.x, nz, maze)) player.z = nz;
      playerMesh.position.set(player.x, 0.5, player.z);
    }

    // zombie update: pathfinding + chase windows + roam/confused
    function updateZombies(delta) {
      for (const z of zombies) {
        const zx = Math.floor(z.position.x), zz = Math.floor(z.position.z);
        const zkey = `${zx},${zz}`;

        // If zombie somehow on main path, push back to center of its cell and switch to roam
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
          // start/continue chase
          z.userData.chaseTimer = (z.userData.chaseTimer || 0) + delta;
          z.userData.state = "chase";

          // recalc path occasionally (throttle)
          z.userData.think -= delta;
          if (!z.userData.path || z.userData.path.length === 0 || z.userData.think <= 0) {
            z.userData.think = 0.8 + Math.random() * 0.8;
            const path = bfsPath(maze, { x: zx, z: zz }, { x: Math.floor(player.x), z: Math.floor(player.z) });
            // remove any path nodes that are on mainPathSet (prevent zombies entering main path)
            z.userData.path = path.filter(node => !mainPathSet.has(`${node.x},${node.z}`)).slice(0, 8);
          }

          if (z.userData.chaseTimer <= 5 && z.userData.path && z.userData.path.length > 0) {
            // move toward next node center
            const next = z.userData.path[0];
            const tx = next.x + 0.5, tz = next.z + 0.5;
            const dx = tx - z.position.x, dz = tz - z.position.z;
            const dist = Math.hypot(dx, dz);
            if (dist > 0.06) {
              const step = (1.0 * delta);
              const nx = z.position.x + (dx / dist) * step;
              const nz = z.position.z + (dz / dist) * step;
              // check collision before applying
              if (!collides(nx, nz, maze)) {
                z.position.x = nx;
                z.position.z = nz;
              } else {
                // can't go (wall) -> abandon path and roam
                z.userData.path = [];
                z.userData.state = "confused";
                z.userData.chaseTimer = 0;
              }
            } else {
              // reached node
              z.userData.path.shift();
            }
            // collision with player handled below
            continue;
          } else {
            // chase window over -> confused
            z.userData.state = "confused";
            z.userData.chaseTimer = 0;
            z.userData.path = [];
            z.userData.think = 0.6 + Math.random();
            continue;
          }
        }

        // if not sees
        if (z.userData.state === "chase") {
          // lost LOS while chasing -> confused
          z.userData.state = "confused";
          z.userData.chaseTimer = 0;
          z.userData.path = [];
          z.userData.think = 0.6 + Math.random();
        }

        if (z.userData.state === "confused") {
          z.userData.think -= delta;
          if (z.userData.think <= 0) {
            // pick 1 random neighbor cell (not mainPath) as short target
            const dirs = [{dx:0,dz:-1},{dx:1,dz:0},{dx:0,dz:1},{dx:-1,dz:0}];
            for (let t=0;t<6;t++) {
              const d = dirs[Math.floor(Math.random()*dirs.length)];
              const nx = Math.max(0, Math.min(maze.w-1, zx + d.dx));
              const nz = Math.max(0, Math.min(maze.h-1, zz + d.dz));
              if (!mainPathSet.has(`${nx},${nz}`) && isRoomCell(maze, nx, nz)) {
                z.userData.path = [{ x: nx, z: nz }];
                break;
              }
            }
            z.userData.think = 0.8 + Math.random() * 1.2;
          }
          if (z.userData.path && z.userData.path.length > 0) {
            const next = z.userData.path[0];
            const tx = next.x + 0.5, tz = next.z + 0.5;
            const dx = tx - z.position.x, dz = tz - z.position.z;
            const dist = Math.hypot(dx, dz);
            if (dist > 0.06) {
              const step = 0.45 * delta;
              const nx = z.position.x + (dx / dist) * step;
              const nz = z.position.z + (dz / dist) * step;
              if (!collides(nx, nz, maze)) {
                z.position.x = nx; z.position.z = nz;
              } else {
                z.userData.path = [];
                z.userData.state = "roam";
              }
            } else {
              z.userData.path.shift();
              if (z.userData.path.length === 0) z.userData.state = "roam";
            }
            continue;
          } else {
            z.userData.state = "roam";
          }
        }

        // roam: pick a nearby room cell occasionally
        if (z.userData.state === "roam") {
          z.userData.think -= delta;
          if (z.userData.think <= 0) {
            z.userData.think = 1.6 + Math.random() * 2.4;
            // find nearby room within radius 3-5
            let found = false;
            for (let t=0;t<12 && !found;t++) {
              const rx = Math.max(0, Math.min(maze.w - 1, zx + Math.floor((Math.random()-0.5)*6)));
              const rz = Math.max(0, Math.min(maze.h - 1, zz + Math.floor((Math.random()-0.5)*6)));
              if (!mainPathSet.has(`${rx},${rz}`) && isRoomCell(maze, rx, rz)) {
                z.userData.path = [{ x: rx, z: rz }];
                found = true;
              }
            }
            if (!found) z.userData.path = [];
          }

          if (z.userData.path && z.userData.path.length > 0) {
            const next = z.userData.path[0];
            const tx = next.x + 0.5, tz = next.z + 0.5;
            const dx = tx - z.position.x, dz = tz - z.position.z;
            const dist = Math.hypot(dx, dz);
            const step = 0.3 * delta;
            if (dist > 0.06) {
              const nx = z.position.x + (dx / dist) * step;
              const nz = z.position.z + (dz / dist) * step;
              if (!collides(nx, nz, maze)) {
                z.position.x = nx; z.position.z = nz;
              } else {
                z.userData.path = [];
              }
            } else {
              z.userData.path.shift();
            }
          }
        }

        // safety -> don't cross into walls
        if (collides(z.position.x, z.position.z, maze)) {
          z.position.x = zx + 0.5; z.position.z = zz + 0.5;
        }

        // collision with player -> game over (use small radius)
        if (!gameOverRef.current && Math.hypot(player.x - z.position.x, player.z - z.position.z) < 0.45) {
          setGameOver(true);
        }
      }
    }

    // animate loop (uses refs for gameOver/levelComplete)
    function animate() {
      animRef.current = requestAnimationFrame(animate);
      const now = performance.now();
      const delta = (now - last) / 1000;
      last = now;

      if (!gameOverRef.current && !levelCompleteRef.current) {
        updateMovement(delta);
        updateZombies(delta);
        setTimeTaken(t => t + delta);
      }

      // camera
      if (zoomRef.current) {
        camera.position.set(maze.w/2, Math.max(maze.w, maze.h)*1.1, maze.h/2);
        camera.rotation.set(-Math.PI/2, 0, 0);
      } else {
        camera.position.set(player.x, 1.4, player.z + 1.4);
        camera.lookAt(player.x, 0.5, player.z);
      }

      // exit detection (player center vs gate cell center)
      const dx = player.x - (exit.x + 0.5);
      const dz = player.z - (exit.z + 0.5);
      if (!levelCompleteRef.current && !gameOverRef.current && Math.hypot(dx, dz) < 0.55) {
        setLevelComplete(true);
      }

      renderer.render(scene, camera);
    }

    animate();

    // cleanup
    return () => {
      try { if (animRef.current) cancelAnimationFrame(animRef.current); } catch {}
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      try { if (mountRef.current && renderer && mountRef.current.contains(renderer.domElement)) mountRef.current.removeChild(renderer.domElement); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [level]);

  // UI handlers
  function handleNextLevel() {
    setLevel(l => l + 1);
    setLevelComplete(false);
    setGameOver(false);
    setTimeTaken(0);
  }
  function handleRestart() {
    // easiest safe way: reload page
    window.location.reload();
  }

  return (
    <div className="canvas-wrap" ref={mountRef}>
      <div className="overlay">
        <b>3D Maze</b><br/>
        Level: {level}<br/>
        Time: {timeTaken.toFixed(2)}s
      </div>

      <div className="zoom-group" style={{ right: 10, top: 140 }}>
        <div className="zoom-btn" onClick={() => (zoomRef.current = false)}>🔍 3D</div>
        <div className="zoom-btn" onClick={() => (zoomRef.current = true)}>🔎 2D</div>
      </div>

      <div className="sound-btn" style={{ right: 14, bottom: 14 }} onClick={() => setBgmOn(s => !s)}>
        {bgmOn ? "🔊" : "🔇"}
      </div>

      {gameOver && (
        <div className="overlay-screen">
          <h2 style={{ color: "crimson" }}>💀 GAME OVER</h2>
          <div style={{ marginTop: 14 }}>
            <button className="btn" onClick={handleRestart}>Restart</button>
          </div>
        </div>
      )}

      {levelComplete && (
        <div className="overlay-screen">
          <h2 style={{ color: "lime" }}>🎉 LEVEL COMPLETE 🎉</h2>
          <div style={{ fontSize: 18, marginTop: 10 }}>Time: {timeTaken.toFixed(2)}s</div>
          <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
            <button className="btn" onClick={handleNextLevel}>Next Level</button>
            <button className="btn" onClick={handleRestart}>Restart</button>
          </div>
        </div>
      )}
    </div>
  );
}
