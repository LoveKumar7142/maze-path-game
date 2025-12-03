export function createBGM() {
  const bgm = new Audio("https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3");
  bgm.loop = true;
  bgm.volume = 0.25;
  return bgm;
}
