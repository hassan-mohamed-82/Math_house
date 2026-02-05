import path from "path";
import fs from "fs/promises";
import { Request } from "express";
import { BadRequest } from "../Errors/BadRequest";
import { BASE64_IMAGE_REGEX } from "../types/constant";

export async function saveBase64Image(
  base64: string,
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
  const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${ext}`;

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
export const validateAndSaveLogo = async (req: Request, logo: string, folder: string): Promise<string> => {
  if (!logo.match(BASE64_IMAGE_REGEX)) {
    throw new BadRequest("Invalid logo format. Must be a base64 encoded image (JPEG, PNG, GIF, or WebP)");
  }
  try {
    await saveBase64Image(logo, req, folder);
    return logo;
  } catch (error: any) {
    throw new BadRequest(`Failed to save logo: ${error.message}`);
  }
};