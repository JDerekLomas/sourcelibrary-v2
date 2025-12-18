export type BookStatus = 'draft' | 'in_progress' | 'complete' | 'published';

export interface BookSummary {
  data: string;
  generated_at: Date;
  page_coverage: number; // Percentage of pages included in summary (0-100)
  model?: string;
}

// Dublin Core metadata for library interoperability
// See: https://www.dublincore.org/specifications/dublin-core/dcmi-terms/
export interface DublinCoreMetadata {
  // dc:title - handled by Book.title / Book.display_title
  // dc:creator - handled by Book.author
  // dc:date - handled by Book.published
  // dc:language - handled by Book.language

  dc_subject?: string[];        // Topics, keywords, classification codes
  dc_description?: string;      // Abstract or table of contents
  dc_publisher?: string;        // Original publisher
  dc_contributor?: string[];    // Other contributors (translators, editors)
  dc_type?: string;             // e.g., "Text", "Manuscript", "Book"
  dc_format?: string;           // Physical format, e.g., "24 cm, 120 pages"
  dc_identifier?: string[];     // ISBN, OCLC number, catalog IDs
  dc_source?: string;           // Physical location (library, archive, collection)
  dc_relation?: string[];       // Related works, other editions
  dc_coverage?: string;         // Geographic or temporal scope
  dc_rights?: string;           // Rights statement (use license for standard licenses)
}

export interface Book {
  id: string;
  _id?: string;
  tenant_id: string;
  title: string;
  display_title?: string;
  author: string;
  language: string;
  published: string;
  thumbnail?: string;
  categories?: string[];
  pages_count?: number;
  created_at?: Date;
  updated_at?: Date;

  // Workflow status
  status?: BookStatus;
  summary?: string | BookSummary;

  // Standard identifiers
  doi?: string;                 // Digital Object Identifier (e.g., "10.5281/zenodo.12345")
  license?: string;             // SPDX identifier (e.g., "CC0-1.0", "CC-BY-4.0")

  // Dublin Core metadata for library interoperability
  dublin_core?: DublinCoreMetadata;
}

export interface OcrData {
  language: string;
  model: string;
  data: string;
  image_urls?: string[];
  updated_at?: Date;
}

export interface TranslationData {
  language: string;
  model: string;
  data: string;
  updated_at?: Date;
}

export interface SummaryData {
  data: string;
  model: string;
  updated_at?: Date;
}

// Crop coordinates for split pages (0-1000 scale)
export interface CropData {
  xStart: number;
  xEnd: number;
  yStart?: number;
  yEnd?: number;
}

export interface Page {
  id: string;
  _id?: string;
  tenant_id: string;
  book_id: string;
  page_number: number;
  photo: string;
  thumbnail?: string;
  compressed_photo?: string;
  ocr: OcrData;
  translation: TranslationData;
  summary?: SummaryData;
  created_at?: Date;
  updated_at?: Date;

  // Split/crop workflow
  photo_original?: string;      // Original S3 URL before cropping
  cropped_photo?: string;       // Local path to cropped image
  crop?: CropData;              // Crop coordinates used
  split_from?: string;          // ID of parent page if this was split from another
  split_detection?: {           // AI detection result
    isTwoPageSpread: boolean;
    confidence: string;
    reasoning?: string;
    leftPage?: CropData;
    rightPage?: CropData;
  };
}

export interface ProcessingPrompts {
  ocr: string;
  translation: string;
  summary: string;
}

export interface Prompt {
  _id?: unknown;
  id?: string;
  name: string;
  type: 'ocr' | 'translation' | 'summary';
  content: string;
  is_default?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

// Default prompts with [[notes]] support
export const DEFAULT_PROMPTS: ProcessingPrompts = {
  ocr: `You are transcribing a Renaissance Latin facsimile.

**Input:** The page image and (if available) the previous page's transcription for context.

**Output:** A faithful Latin text in Markdown format.

**Instructions:**
1. Begin with \`[[notes: ...]]\` summarizing any image issues, uncertain readings, layout observations, or alternate expansions.
2. Include \`[[page number: ####]]\` near the top if visible.
3. Preserve original capitalization, punctuation, and spacing when legible.
4. Use Markdown formatting (headings, centered lines, italics) so the transcription resembles the source layout.
5. Mark uncertain characters or alternate readings inline with \`[[notes: ...]]\`.
6. Expand abbreviations only when certain; otherwise note the ambiguity in \`[[notes]]\`.

**Language:** {language}`,

  translation: `You are translating a freshly transcribed Latin text into accessible English.

**Input:** The OCR transcription and (if available) the previous page's translation for continuity.

**Output:** A layperson-friendly English translation in Markdown format.

**Instructions:**
1. Start with \`[[notes: ...]]\` mentioning prior-page context, interpretive choices, tricky phrases, historical references, or multiple possible readings.
2. Use clear Markdown mirroring the source layout (headings, centered text, line breaks).
3. Keep \`[[notes: ...]]\` inline wherever extra explanation or alternate translations help a general reader.
4. Style: warm museum label—explain references rather than leaving jargon unexplained.
5. Always mention continuity with the previous page if relevant.

**Source language:** {source_language}
**Target language:** {target_language}`,

  summary: `Summarize the contents of this page for a general, non-specialist reader.

**Input:** The translated text and (if available) the previous page's summary for context.

**Output:** A 3-5 sentence summary in Markdown format.

**Instructions:**
1. Write 3 to 5 clear sentences, optionally with bullet points.
2. Mention key people, ideas, and why the page matters to modern audiences.
3. Highlight continuity with the previous page in \`[[notes: ...]]\` at the top if relevant.
4. Make it accessible to someone who has never read the original text.`
};

// Parse [[notes: ...]] from text
export function parseNotes(text: string): { content: string; notes: string[] } {
  const notePattern = /\[\[notes?:\s*(.*?)\]\]/gi;
  const notes: string[] = [];

  const content = text.replace(notePattern, (match, noteContent) => {
    notes.push(noteContent.trim());
    return ''; // Remove from main content, or keep if you want inline
  });

  return { content: content.trim(), notes };
}

// Extract page number from [[page number: ####]]
export function extractPageNumber(text: string): number | null {
  const match = text.match(/\[\[page\s*number:\s*(\d+)\]\]/i);
  return match ? parseInt(match[1], 10) : null;
}
