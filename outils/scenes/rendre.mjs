// node rendre.mjs <playwright-core/index.mjs> <dossier de sortie> [secondes] : filme les scènes de scenes.html en MP4.
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
const [, , pw, sortie, sec = "9", seul] = process.argv;
const { chromium } = await import(pathToFileURL(pw));
const b = await chromium.launch({ channel: "chrome" });
const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
p.on("pageerror", (e) => console.log("ERR", e.message));
await p.goto(new URL("scenes.html", import.meta.url).href);
for (const n of ["chien", "canard", "saut", "poursuite"]) {
  if (seul && seul !== n) continue;
  const f = spawn("ffmpeg", ["-loglevel", "error", "-y", "-f", "image2pipe", "-framerate", "30", "-c:v", "mjpeg", "-i", "-", "-c:v", "libx264", "-crf", "17", "-pix_fmt", "yuv420p", `${sortie}/${n}.mp4`], { stdio: ["pipe", "inherit", "inherit"] });
  for (let i = 0; i < +sec * 30; i++) f.stdin.write(Buffer.from(await p.evaluate(([n, t]) => image(n, t), [n, i / 30]), "base64"));
  f.stdin.end();
  await new Promise((r) => f.on("close", r));
  console.log(n);
}
await b.close();
