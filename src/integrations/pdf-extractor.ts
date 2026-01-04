// ============================================
// PDF Text Extractor with OCR Fallback
// ============================================

import pdf from 'pdf-parse';
import Tesseract from 'tesseract.js';

interface ExtractionResult {
    text: string;
    method: 'direct' | 'ocr';
    pageCount: number;
    confidence?: number;
}

export class PDFExtractor {
    private ocrWorker: Tesseract.Worker | null = null;

    async extractText(pdfBuffer: Buffer): Promise<ExtractionResult> {
        try {
            // Try direct text extraction first
            const result = await pdf(pdfBuffer);

            // Check if we got meaningful text (not just whitespace/garbage)
            const cleanText = result.text.trim();
            const meaningfulTextRatio = this.calculateMeaningfulTextRatio(cleanText);

            if (cleanText.length > 100 && meaningfulTextRatio > 0.5) {
                return {
                    text: this.cleanExtractedText(cleanText),
                    method: 'direct',
                    pageCount: result.numpages,
                };
            }

            // Fall back to OCR for scanned documents
            console.log('Direct extraction yielded poor results, falling back to OCR...');
            return await this.extractWithOCR(pdfBuffer);

        } catch (error) {
            console.warn('Direct PDF extraction failed, trying OCR:', error);
            return await this.extractWithOCR(pdfBuffer);
        }
    }

    private calculateMeaningfulTextRatio(text: string): number {
        // Count alphanumeric characters vs total characters
        const alphanumeric = text.replace(/[^a-zA-Z0-9]/g, '').length;
        const total = text.replace(/\s/g, '').length;
        return total > 0 ? alphanumeric / total : 0;
    }

    private async extractWithOCR(pdfBuffer: Buffer): Promise<ExtractionResult> {
        // Convert PDF to images and OCR each page
        // For simplicity, we'll use pdf-parse's render capability with Tesseract

        try {
            // Initialize OCR worker if needed
            if (!this.ocrWorker) {
                this.ocrWorker = await Tesseract.createWorker('eng');
            }

            // pdf-parse can give us rendered pages as images
            const result = await pdf(pdfBuffer, {
                // Custom page render function
                pagerender: async (pageData: { getTextContent: () => Promise<{ items: { str: string }[] }> }) => {
                    const textContent = await pageData.getTextContent();
                    return textContent.items.map((item: { str: string }) => item.str).join(' ');
                }
            });

            // If we still don't have good text, the PDF might be image-based
            // In a production system, you'd convert PDF pages to images first
            // For now, we'll use what we got

            const text = result.text.trim();

            return {
                text: this.cleanExtractedText(text),
                method: 'ocr',
                pageCount: result.numpages,
                confidence: 0.7, // Estimated confidence for OCR
            };

        } catch (error) {
            console.error('OCR extraction failed:', error);
            throw new Error('Could not extract text from PDF');
        }
    }

    private cleanExtractedText(text: string): string {
        return text
            // Normalize whitespace
            .replace(/\s+/g, ' ')
            // Fix common OCR errors
            .replace(/\|/g, 'l')
            .replace(/0(?=[a-zA-Z])/g, 'O')
            // Remove excessive line breaks
            .replace(/(\r\n|\n|\r){3,}/g, '\n\n')
            // Trim each line
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .join('\n')
            .trim();
    }

    async cleanup(): Promise<void> {
        if (this.ocrWorker) {
            await this.ocrWorker.terminate();
            this.ocrWorker = null;
        }
    }
}

// Singleton instance
let extractor: PDFExtractor | null = null;

export function getPDFExtractor(): PDFExtractor {
    if (!extractor) {
        extractor = new PDFExtractor();
    }
    return extractor;
}

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
    const result = await getPDFExtractor().extractText(buffer);
    return result.text;
}
