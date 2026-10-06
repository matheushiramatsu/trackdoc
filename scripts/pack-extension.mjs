import { ZipArchive } from "archiver";
import { createWriteStream, mkdirSync, rmSync } from "node:fs";

const out = "downloads/trackdoc-captura.zip";
mkdirSync("downloads", { recursive: true });
rmSync(out, { force: true });

const output = createWriteStream(out);
const archive = new ZipArchive({ zlib: { level: 9 } });
const finished = new Promise((resolve, reject) => {
  output.on("close", resolve);
  output.on("error", reject);
  archive.on("error", reject);
  archive.on("warning", (error) => {
    if (error.code === "ENOENT") console.warn(error.message);
    else reject(error);
  });
});

archive.pipe(output);
archive.glob("**/*", {
  cwd: "extension",
  ignore: ["**/*.test.js", "**/.DS_Store"],
});
archive.finalize();
await finished;
console.log(`Extensão TrackDoc gerada em ${out}`);
