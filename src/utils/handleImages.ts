import path from "path";
import fs from "fs/promises";
import { Request } from "express";

export async function saveBase64Image(
  base64: string,
  userId: string,
  req: Request,
  folder: string
): Promise<string> {
  const matches = base64.match(/^data:(.+);base64,(.+)$/);
  let ext = "png";
  let data = base64;

  if (matches && matches.length === 3) {
    ext = matches[1].split("/")[1];
    data = matches[2];
  }

  const buffer = Buffer.from(data, "base64");
  const fileName = `${userId}.${ext}`;

  const rootDir = path.resolve(__dirname, "../../");
  const uploadsDir = path.join(rootDir, "uploads", folder);

  try {
    await fs.mkdir(uploadsDir, { recursive: true });
    await fs.writeFile(path.join(uploadsDir, fileName), buffer);
  } catch (err) {
    console.error("❌ Failed to save image:", err);
    throw err;
  }

  const protocol = req.get("x-forwarded-proto") || req.protocol || "https";

  return `${protocol}://${req.get("host")}/uploads/${folder}/${fileName}`;
}
