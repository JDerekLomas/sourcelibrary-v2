'use client';

import { useMemo } from 'react';

interface NotesRendererProps {
  text: string;
  className?: string;
}

interface ParsedSegment {
  type: 'text' | 'note' | 'page_number';
  content: string;
}

function parseTextWithNotes(text: string): ParsedSegment[] {
  const segments: ParsedSegment[] = [];
  const pattern = /\[\[(notes?|page\s*number):\s*(.*?)\]\]/gi;

  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    // Add text before this match
    if (match.index > lastIndex) {
      segments.push({
        type: 'text',
        content: text.slice(lastIndex, match.index)
      });
    }

    // Add the note/page number
    const type = match[1].toLowerCase().includes('page') ? 'page_number' : 'note';
    segments.push({
      type,
      content: match[2].trim()
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    segments.push({
      type: 'text',
      content: text.slice(lastIndex)
    });
  }

  return segments;
}

export default function NotesRenderer({ text, className = '' }: NotesRendererProps) {
  const segments = useMemo(() => parseTextWithNotes(text), [text]);

  if (!text) {
    return (
      <div className={`text-[var(--text-muted)] italic ${className}`}>
        No content yet...
      </div>
    );
  }

  return (
    <div className={`prose-manuscript ${className}`}>
      {segments.map((segment, index) => {
        if (segment.type === 'note') {
          return (
            <span key={index} className="note-annotation">
              {segment.content}
            </span>
          );
        }

        if (segment.type === 'page_number') {
          return (
            <span key={index} className="note-page-number">
              Page {segment.content}
            </span>
          );
        }

        // Regular text - render with basic markdown support
        return (
          <span key={index} className="whitespace-pre-wrap">
            {segment.content}
          </span>
        );
      })}
    </div>
  );
}
