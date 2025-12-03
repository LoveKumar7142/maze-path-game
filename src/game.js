export function collides(nx, nz, maze) {
  const x = Math.floor(nx);
  const z = Math.floor(nz);

  if (x < 0 || z < 0 || x >= maze.w || z >= maze.h) return true;

  const cell = maze.grid[z][x];

  const lx = nx - x;
  const lz = nz - z;

  const margin = 0.45;
  const radius = 0.35; // new distance for corners

  // Normal wall collision
  if (cell.walls[0] === 1 && lz < margin) return true;
  if (cell.walls[2] === 1 && lz > 1 - margin) return true;
  if (cell.walls[3] === 1 && lx < margin) return true;
  if (cell.walls[1] === 1 && lx > 1 - margin) return true;

  // Smooth CORNER collision (rounded corners)
  if (cell.walls[0] && cell.walls[3]) { // top-left
    if (lx*lx + lz*lz < radius*radius) return true;
  }
  if (cell.walls[0] && cell.walls[1]) { // top-right
    if ((1-lx)*(1-lx) + lz*lz < radius*radius) return true;
  }
  if (cell.walls[2] && cell.walls[3]) { // bottom-left
    if (lx*lx + (1-lz)*(1-lz) < radius*radius) return true;
  }
  if (cell.walls[2] && cell.walls[1]) { // bottom-right
    if ((1-lx)*(1-lx) + (1-lz)*(1-lz) < radius*radius) return true;
  }

  return false;
}

