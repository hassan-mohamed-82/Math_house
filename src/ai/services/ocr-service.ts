import Tesseract from 'tesseract.js';
import path from 'path';

/**
 * Extracts text from an image file or buffer.
 * @param imageSource - The relative or absolute path to the image file, or a Buffer.
 * @param language - The language code (default is 'eng' for English).
 */
export async function extractTextFromImage(imageSource: string | Buffer, language: string = 'eng'): Promise<string> {
    try {
        const sourceDescription = Buffer.isBuffer(imageSource) ? "Buffer" : imageSource;
        console.log(`Processing image: ${sourceDescription}...`);

        // Tesseract.recognize takes the image and language as arguments
        const result = await Tesseract.recognize(
            imageSource,
            language,
            {
                logger: (m) => console.log(`Progress: ${Math.round(m.progress * 100)}% - ${m.status}`),
                // Logger is optional but helpful to see the progress bars in console
            }
        );

        const extractedText = result.data.text;

        return extractedText;

    } catch (error) {
        console.error("Error extracting text:", error);
        throw new Error("Failed to process image.");
    }
}

// --- Usage Example ---
// The following code is for testing purposes only.
// Uncomment and providing a valid image path to run it directly.

/*
// Assuming you have an image named 'receipt.jpg' in the same folder
const imageFile = path.join(__dirname, 'receipt.jpg');

// executing the function
extractTextFromImage(imageFile)
  .then((text) => {
    console.log('--- Extracted Text ---');
    console.log(text);
    console.log('----------------------');
  })
  .catch((err) => console.error(err));
*/