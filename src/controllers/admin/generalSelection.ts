import { Request, Response } from "express";
import { CALCULATOR_TYPES } from "../../constants/calculators";
import { SuccessResponse } from "../../utils/response";

export const getAllCalculators = async (req: Request, res: Response) => {
    return SuccessResponse(res, {
        message: "Calculator types fetched successfully",
        data: {
            calculatorTypes: CALCULATOR_TYPES,
        },
    }, 200);
};