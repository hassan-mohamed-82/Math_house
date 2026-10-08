import PDFDocument from "pdfkit";

export type MistakePdfQuestion = {
    studentName: string;
    sourceTitle: string;
    question: string;
    selectedAnswer: string;
    correctAnswer: string;
    explanation: string;
};

export const createMistakesPdf = (
    title: string,
    questions: MistakePdfQuestion[],
    includeAnswers: boolean
): Promise<Buffer> => new Promise((resolve, reject) => {
    const document = new PDFDocument({ margin: 48, size: "A4" });
    const chunks: Buffer[] = [];

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
