import { createHash } from "node:crypto";
import { createReadStream, statSync } from "node:fs";

export type FileHash = {
  sha256: string;
  size_bytes: number;
};

export function sha256File(path: string): Promise<FileHash> {
  const size_bytes = statSync(path).size;
  const hash = createHash("sha256");
  const stream = createReadStream(path);

  return new Promise((resolve, reject) => {
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", () => {
      resolve({
        sha256: hash.digest("hex"),
        size_bytes
      });
    });
  });
}
