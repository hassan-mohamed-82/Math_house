"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllCalculators = void 0;
const calculators_1 = require("../../constants/calculators");
const response_1 = require("../../utils/response");
const getAllCalculators = async (req, res) => {
    return (0, response_1.SuccessResponse)(res, {
        message: "Calculator types fetched successfully",
        data: {
            calculatorTypes: calculators_1.CALCULATOR_TYPES,
        },
    }, 200);
};
exports.getAllCalculators = getAllCalculators;
