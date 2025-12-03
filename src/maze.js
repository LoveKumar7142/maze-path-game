export function generateMaze(baseW, baseH, level = 1) {
  const w = baseW + (level - 1) * 5;
  const h = baseH + (level - 1) * 5;

  const grid = Array.from({ length: h }, () =>
    Array.from({ length: w }, () => ({
      visited: false,
      walls: [1, 1, 1, 1],
    }))
  );

  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  function carve(x, y) {
    grid[y][x].visited = true;

    const dirs = shuffle([
      { dx: 0, dy: -1, w: 0 },
      { dx: 1, dy: 0, w: 1 },
      { dx: 0, dy: 1, w: 2 },
      { dx: -1, dy: 0, w: 3 },
    ]);

    dirs.forEach((d) => {
      const nx = x + d.dx;
      const ny = y + d.dy;

      if (
        nx >= 0 &&
        nx < w &&
        ny >= 0 &&
        ny < h &&
        !grid[ny][nx].visited
      ) {
        grid[y][x].walls[d.w] = 0;
        grid[ny][nx].walls[(d.w + 2) % 4] = 0;
        carve(nx, ny);
      }
    });
  }

  carve(0, 0);

  // ALTERNATE ESCAPE PATHS = 1 to 4
const extraPaths = 2 + Math.floor(Math.random() * 3); 


  for (let i = 0; i < extraPaths; i++) {
    const x = Math.floor(Math.random() * w);
    const y = Math.floor(Math.random() * h);

    const dirs = [
      { wall: 0, nx: x, ny: y - 1 },
      { wall: 1, nx: x + 1, ny: y },
      { wall: 2, nx: x, ny: y + 1 },
      { wall: 3, nx: x - 1, ny: y },
    ];

    const d = dirs[Math.floor(Math.random() * dirs.length)];

    if (d.nx >= 0 && d.nx < w && d.ny >= 0 && d.ny < h) {
      grid[y][x].walls[d.wall] = 0;
      grid[d.ny][d.nx].walls[(d.wall + 2) % 4] = 0;
    }
  }

  return { grid, w, h };
}
