export function collides(nx, nz, maze) {
  const x = Math.floor(nx);
  const z = Math.floor(nz);

  if (x < 0 || z < 0 || x >= maze.w || z >= maze.h) return true;

  const cell = maze.grid[z][x];

  const lx = nx - x;
  const lz = nz - z;

  const margin = 0.4; // bigger safe margin

  if (cell.walls[0] === 1 && lz < margin) return true;
  if (cell.walls[2] === 1 && lz > 1 - margin) return true;
  if (cell.walls[3] === 1 && lx < margin) return true;
  if (cell.walls[1] === 1 && lx > 1 - margin) return true;

  return false;
}
