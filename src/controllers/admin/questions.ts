import { Request, Response } from "express";
import { SuccessResponse } from "../../utils/response";
import { extractTextFromImage } from "../../ai/services/ocr-service";
import { BadRequest } from "../../Errors/BadRequest";

export const getTextfromImage = async (req: Request, res: Response) => {
    const imageSource = req.file?.buffer || req.body?.image;

    if (!imageSource) throw new BadRequest("Image is required (upload file or provide image URL)");

    const text = await extractTextFromImage(imageSource);

    if (!text) throw new BadRequest("Failed to extract text");

    return SuccessResponse(res, { message: "Text extracted successfully", data: text }, 200);
}
