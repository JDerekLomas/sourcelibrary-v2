'use client';

import { useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

interface NotesRendererProps {
  text: string;
  className?: string;
}

// Convert [[notes:...]] to numbered superscripts and collect footnotes
function processNotesForMarkdown(text: string): { processedText: string; footnotes: string[] } {
  const footnotes: string[] = [];

  // Replace [[notes:...]] with superscript markers
  // We use a special format that won't be parsed as markdown: ^[n]^
  const processedText = text.replace(/\[\[(notes?):\s*(.*?)\]\]/gi, (match, type, content) => {
    footnotes.push(content.trim());
    return `<sup class="note-ref">${footnotes.length}</sup>`;
  });

  // Replace [[page number:...]] with styled page markers
  const finalText = processedText.replace(/\[\[page\s*number:\s*(.*?)\]\]/gi, (match, pageNum) => {
    return `<span class="page-marker">Page ${pageNum.trim()}</span>`;
  });

  return { processedText: finalText, footnotes };
}

export default function NotesRenderer({ text, className = '' }: NotesRendererProps) {
  const { processedText, footnotes } = useMemo(() => processNotesForMarkdown(text), [text]);

  if (!text) {
    return (
      <div className={`text-[var(--text-muted)] italic ${className}`}>
        No content yet...
      </div>
    );
  }

  return (
    <div className={`prose-manuscript ${className}`}>
      {/* Main text rendered as single markdown block */}
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        allowedElements={[
          'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'ul', 'ol', 'li', 'blockquote', 'code', 'pre',
          'em', 'strong', 'del', 'hr', 'br', 'a',
          'table', 'thead', 'tbody', 'tr', 'th', 'td',
          'sup', 'span'
        ]}
        unwrapDisallowed={true}
        components={{
          p: ({ children }) => <p className="mb-4 last:mb-0 leading-relaxed">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          h1: ({ children }) => (
            <h1 className="text-2xl font-serif font-bold mt-6 mb-3 text-[var(--text-primary)]">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-serif font-bold mt-5 mb-2 text-[var(--text-primary)]">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-serif font-semibold mt-4 mb-2 text-[var(--text-primary)]">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-base font-serif font-semibold mt-3 mb-1 text-[var(--text-primary)]">{children}</h4>
          ),
          ul: ({ children }) => <ul className="list-disc ml-5 my-3 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal ml-5 my-3 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-3 border-amber-300 pl-4 my-4 italic text-stone-600 bg-amber-50/30 py-2 pr-2 rounded-r">
              {children}
            </blockquote>
          ),
          code: ({ children }) => (
            <code className="bg-stone-100 px-1.5 py-0.5 rounded text-sm font-mono text-stone-700">{children}</code>
          ),
          pre: ({ children }) => (
            <pre className="bg-stone-100 p-3 rounded-lg overflow-x-auto my-3 text-sm">{children}</pre>
          ),
          hr: () => <hr className="my-6 border-stone-200" />,
          a: ({ href, children }) => (
            <a href={href} className="text-amber-700 underline hover:text-amber-800" target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          // Table support
          table: ({ children }) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border-collapse border border-stone-200">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-stone-100">{children}</thead>,
          tbody: ({ children }) => <tbody>{children}</tbody>,
          tr: ({ children }) => <tr className="border-b border-stone-200">{children}</tr>,
          th: ({ children }) => (
            <th className="px-3 py-2 text-left text-sm font-semibold text-stone-700 border border-stone-200">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 text-sm text-stone-600 border border-stone-200">{children}</td>
          ),
          // Custom elements for notes
          sup: ({ children, className }) => {
            if (className === 'note-ref') {
              const noteIndex = parseInt(String(children), 10);
              const noteContent = footnotes[noteIndex - 1] || '';
              return (
                <sup className="text-amber-700 cursor-help font-medium ml-0.5" title={noteContent}>
                  {children}
                </sup>
              );
            }
            return <sup>{children}</sup>;
          },
          span: ({ children, className }) => {
            if (className === 'page-marker') {
              return (
                <span className="inline-block bg-stone-100 text-stone-500 text-xs px-2 py-0.5 rounded font-medium my-1">
                  {children}
                </span>
              );
            }
            return <span>{children}</span>;
          },
        }}
      >
        {processedText}
      </ReactMarkdown>

      {/* Footnotes section */}
      {footnotes.length > 0 && (
        <div className="mt-6 pt-4 border-t border-stone-200">
          <div className="text-xs font-medium text-stone-500 uppercase tracking-wide mb-2">
            Notes
          </div>
          <ol className="list-none space-y-1.5 text-sm text-stone-600">
            {footnotes.map((note, index) => (
              <li key={index} className="flex gap-2">
                <span className="text-amber-700 font-medium flex-shrink-0">{index + 1}.</span>
                <span>{note}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
