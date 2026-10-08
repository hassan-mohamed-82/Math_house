"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMistakesPdf = void 0;
const pdfkit_1 = __importDefault(require("pdfkit"));
const createMistakesPdf = (title, questions, includeAnswers) => new Promise((resolve, reject) => {
    const document = new pdfkit_1.default({ margin: 48, size: "A4" });
    const chunks = [];
    document.on("data", chunk => chunks.push(Buffer.from(chunk)));
    document.on("error", reject);
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.fontSize(18).text(title, { underline: true });
    document.moveDown();
    questions.forEach((item, index) => {
        document.fontSize(12).font("Helvetica-Bold").text(`${index + 1}. ${item.studentName} - ${item.sourceTitle}`);
        document.font("Helvetica").text(item.question || "Question text unavailable");
        if (includeAnswers) {
            document.moveDown(0.3).font("Helvetica-Bold").text("Student answer:");
            document.font("Helvetica").text(item.selectedAnswer || "No answer recorded");
            document.moveDown(0.3).font("Helvetica-Bold").text("Correct answer:");
            document.font("Helvetica").text(item.correctAnswer || "Correct answer unavailable");
            if (item.explanation) {
                document.moveDown(0.3).font("Helvetica-Bold").text("Explanation:");
                document.font("Helvetica").text(item.explanation);
            }
        }
        document.moveDown();
    });
    document.end();
});
exports.createMistakesPdf = createMistakesPdf;
