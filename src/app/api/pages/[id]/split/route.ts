import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

interface SplitRequest {
  side: 'left' | 'right'; // Which half to keep on this page
  splitRatio?: number; // Where to split (0-100, default 50)
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: pageId } = await params;
    const body: SplitRequest = await request.json();
    const { side, splitRatio = 50 } = body;

    const db = await getDb();

    // Get the current page
    const currentPage = await db.collection('pages').findOne({ id: pageId });
    if (!currentPage) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    if (!currentPage.photo) {
      return NextResponse.json({ error: 'Page has no image' }, { status: 400 });
    }

    // Get the book to find all pages and determine next page number
    const book = await db.collection('books').findOne({ id: currentPage.book_id });
    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    // Get all pages for this book to find max page number
    const allPages = await db.collection('pages')
      .find({ book_id: currentPage.book_id })
      .sort({ page_number: 1 })
      .toArray();

    const currentIndex = allPages.findIndex(p => p.id === pageId);
    const currentPageNumber = currentPage.page_number;

    // Generate new page ID
    const newPageId = new ObjectId().toHexString();

    // Store the crop info for both pages
    // We'll store crop percentages and let the frontend handle the actual cropping display
    const leftCrop = { xStart: 0, xEnd: splitRatio };
    const rightCrop = { xStart: splitRatio, xEnd: 100 };

    // Update current page with crop info (keeps the selected side)
    const currentCrop = side === 'left' ? leftCrop : rightCrop;
    await db.collection('pages').updateOne(
      { id: pageId },
      {
        $set: {
          'crop': currentCrop,
          updated_at: new Date()
        }
      }
    );

    // Create new page with the other half
    const newCrop = side === 'left' ? rightCrop : leftCrop;
    const newPageNumber = currentPageNumber + 0.5; // Will be renumbered

    const newPage = {
      id: newPageId,
      book_id: currentPage.book_id,
      page_number: newPageNumber,
      photo: currentPage.photo, // Same image, different crop
      crop: newCrop,
      ocr: null,
      translation: null,
      summary: null,
      created_at: new Date(),
      updated_at: new Date()
    };

    await db.collection('pages').insertOne(newPage);

    // Renumber all pages after the current one
    // Get all pages again and sort by page_number
    const updatedPages = await db.collection('pages')
      .find({ book_id: currentPage.book_id })
      .sort({ page_number: 1 })
      .toArray();

    // Renumber sequentially
    for (let i = 0; i < updatedPages.length; i++) {
      await db.collection('pages').updateOne(
        { id: updatedPages[i].id },
        { $set: { page_number: i + 1 } }
      );
    }

    // Update book page count
    await db.collection('books').updateOne(
      { id: currentPage.book_id },
      { $set: { pages: updatedPages.length } }
    );

    return NextResponse.json({
      success: true,
      currentPage: {
        id: pageId,
        crop: currentCrop
      },
      newPage: {
        id: newPageId,
        crop: newCrop,
        page_number: currentPageNumber + 1
      }
    });
  } catch (error) {
    console.error('Error splitting page:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Split failed' },
      { status: 500 }
    );
  }
}
