import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: bookId } = await params;
    const { pageOrder } = await request.json();

    if (!Array.isArray(pageOrder)) {
      return NextResponse.json({ error: 'pageOrder must be an array of page IDs' }, { status: 400 });
    }

    const db = await getDb();

    // Verify book exists
    const book = await db.collection('books').findOne({ id: bookId });
    if (!book) {
      return NextResponse.json({ error: 'Book not found' }, { status: 404 });
    }

    // Update each page's page_number based on its position in the array
    for (let i = 0; i < pageOrder.length; i++) {
      await db.collection('pages').updateOne(
        { id: pageOrder[i], book_id: bookId },
        { $set: { page_number: i + 1, updated_at: new Date() } }
      );
    }

    return NextResponse.json({ success: true, reordered: pageOrder.length });
  } catch (error) {
    console.error('Reorder error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Reorder failed' },
      { status: 500 }
    );
  }
}
