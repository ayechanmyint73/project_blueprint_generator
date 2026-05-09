<?php

namespace App\Services;

use Exception;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Str;
use PhpOffice\PhpWord\Element\Text;
use PhpOffice\PhpWord\Element\TextRun;
use PhpOffice\PhpWord\IOFactory;
use Spatie\PdfToText\Pdf;

class DocumentTextExtractionService
{
    public function extractFromUploadedFile(UploadedFile $file, int $maxChars = 7000): string
    {
        $ext = strtolower((string) $file->getClientOriginalExtension());

        $text = match ($ext) {
            'pdf' => $this->extractPdf($file->getRealPath()),
            'docx' => $this->extractDocx($file->getRealPath()),
            'txt' => $this->extractTxt($file->getRealPath()),
            default => throw new Exception('Unsupported file type'),
        };

        $cleaned = $this->cleanText($text);

        if ($cleaned === '') {
            throw new Exception('Could not extract readable text from the uploaded file.');
        }

        return Str::limit($cleaned, $maxChars, '');
    }

    private function extractPdf(string $path): string
    {
        try {
            return (string) Pdf::getText($path);
        } catch (\Throwable $e) {
            throw new Exception('PDF extraction failed.');
        }
    }

    private function extractDocx(string $path): string
    {
        try {
            $phpWord = IOFactory::load($path, 'Word2007');
            $parts = [];

            foreach ($phpWord->getSections() as $section) {
                foreach ($section->getElements() as $element) {
                    if ($element instanceof Text) {
                        $parts[] = (string) $element->getText();
                    }

                    if ($element instanceof TextRun) {
                        foreach ($element->getElements() as $childElement) {
                            if ($childElement instanceof Text) {
                                $parts[] = (string) $childElement->getText();
                            }
                        }
                    }
                }
            }

            return implode(' ', $parts);
        } catch (\Throwable $e) {
            throw new Exception('DOCX extraction failed.');
        }
    }

    private function extractTxt(string $path): string
    {
        if (!File::exists($path)) {
            throw new Exception('Text file not found.');
        }

        return (string) File::get($path);
    }

    private function cleanText(string $text): string
    {
        $text = preg_replace('/\s+/u', ' ', $text) ?? '';
        $text = strip_tags($text);
        return trim($text);
    }
}
