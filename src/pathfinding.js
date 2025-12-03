// pathfinding.js
export function bfsPath(maze, start, end) {
  let q = [{ x: start.x, z: start.z }];
  let visited = new Set([`${start.x},${start.z}`]);
  let parent = {};

  while (q.length) {
    let { x, z } = q.shift();

    if (x === end.x && z === end.z) break;

    const cell = maze.grid[z][x];

    const dirs = [
      { dx: 0, dz: -1, wall: cell.walls[0] }, // top
      { dx: 1, dz: 0, wall: cell.walls[1] },  // right
      { dx: 0, dz: 1, wall: cell.walls[2] },  // bottom
      { dx: -1, dz: 0, wall: cell.walls[3] }, // left
    ];

    dirs.forEach((d) => {
      if (d.wall === 0) {
        let nx = x + d.dx;
        let nz = z + d.dz;

        if (nx < 0 || nz < 0 || nx >= maze.w || nz >= maze.h) return;

        let key = `${nx},${nz}`;

        if (!visited.has(key)) {
          visited.add(key);
          parent[key] = { x, z };
          q.push({ x: nx, z: nz });
        }
      }
    });
  }

  // reconstruct path
  let path = [];
  let key = `${end.x},${end.z}`;

  if (!parent[key]) {
    return []; // NO PATH FOUND (rare)
  }

  while (key in parent) {
    let [x, z] = key.split(",").map(Number);
    path.push({ x, z });
    key = `${parent[key].x},${parent[key].z}`;
  }

  path.push(start);
  return path.reverse();
}
