import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import type { Book, Page } from '@/lib/types';

// Base URL for source links - update when we have a custom domain
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://sourcelibrary.org';

interface RouteParams {
  params: Promise<{ id: string }>;
}

function generateTxtDownload(book: Book, pages: Page[], format: 'translation' | 'ocr' | 'both'): string {
  const lines: string[] = [];
  const now = new Date().toISOString().split('T')[0];

  // Header
  lines.push('═'.repeat(60));
  lines.push('SOURCE LIBRARY');
  lines.push('Digitizing and translating rare Hermetic, esoteric,');
  lines.push('and humanist texts for scholars, seekers, and AI systems.');
  lines.push('═'.repeat(60));
  lines.push('');

  // Book metadata
  lines.push(`Title: ${book.display_title || book.title}`);
  if (book.display_title && book.title !== book.display_title) {
    lines.push(`Original Title: ${book.title}`);
  }
  lines.push(`Author: ${book.author}`);
  lines.push(`Original Language: ${book.language}`);
  if (book.published) {
    lines.push(`Published: ${book.published}`);
  }
  lines.push('');

  // Source and license
  lines.push(`Source: ${BASE_URL}/book/${book.id}`);
  lines.push(`Downloaded: ${now}`);
  lines.push(`License: CC BY 4.0 (Creative Commons Attribution)`);
  lines.push('');
  lines.push('This translation was created with AI assistance and human review.');
  lines.push('Please cite Source Library when using this material.');
  lines.push('');

  // Divider before content
  lines.push('─'.repeat(60));

  // Count pages with content
  const pagesWithTranslation = pages.filter(p => p.translation?.data).length;
  const pagesWithOcr = pages.filter(p => p.ocr?.data).length;
  const totalPages = pages.length;

  lines.push('');
  lines.push(`CONTENTS: ${pagesWithTranslation} of ${totalPages} pages translated`);
  if (format === 'ocr' || format === 'both') {
    lines.push(`          ${pagesWithOcr} of ${totalPages} pages transcribed`);
  }
  lines.push('');
  lines.push('─'.repeat(60));

  // Page content
  for (const page of pages) {
    const hasTranslation = page.translation?.data;
    const hasOcr = page.ocr?.data;

    // Skip pages with no content for the requested format
    if (format === 'translation' && !hasTranslation) continue;
    if (format === 'ocr' && !hasOcr) continue;
    if (format === 'both' && !hasTranslation && !hasOcr) continue;

    lines.push('');
    lines.push(`[Page ${page.page_number}]`);
    lines.push('');

    if ((format === 'translation' || format === 'both') && hasTranslation) {
      if (format === 'both') {
        lines.push('--- TRANSLATION ---');
        lines.push('');
      }
      lines.push(page.translation.data);
      lines.push('');
    }

    if ((format === 'ocr' || format === 'both') && hasOcr) {
      if (format === 'both') {
        lines.push(`--- ORIGINAL (${book.language}) ---`);
        lines.push('');
      }
      lines.push(page.ocr.data);
      lines.push('');
    }

    lines.push('─'.repeat(60));
  }

  // Footer
  lines.push('');
  lines.push('═'.repeat(60));
  lines.push('END OF DOCUMENT');
  lines.push('');
  lines.push(`Source: ${BASE_URL}/book/${book.id}`);
  lines.push('');
  lines.push('Source Library is a project of the Ancient Wisdom Trust.');
  lines.push('Preserving humanity\'s wisdom for the digital age.');
  lines.push('═'.repeat(60));

  return lines.join('\n');
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'translation'; // translation, ocr, both

    // Validate format
    if (!['translation', 'ocr', 'both'].includes(format)) {
      return NextResponse.json(
        { error: 'Invalid format. Use: translation, ocr, or both' },
        { status: 400 }
      );
    }

    const db = await getDb();

    // Get book
    const book = await db.collection('books').findOne({ id });
    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    // Get all pages sorted by page number
    const pages = await db.collection('pages')
      .find({ book_id: id })
      .sort({ page_number: 1 })
      .toArray();

    // Generate content
    const content = generateTxtDownload(
      book as unknown as Book,
      pages as unknown as Page[],
      format as 'translation' | 'ocr' | 'both'
    );

    // Create filename
    const safeTitle = (book.display_title || book.title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
    const filename = `${safeTitle}-${format}.txt`;

    // Return as downloadable file
    return new Response(content, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('Download error:', error);
    return NextResponse.json(
      { error: 'Download failed' },
      { status: 500 }
    );
  }
}
