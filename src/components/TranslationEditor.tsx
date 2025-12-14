'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  Loader2,
  ChevronLeft,
  ChevronRight,
  Settings,
  X,
  Eye,
  Pencil,
  Copy,
  Check
} from 'lucide-react';
import NotesRenderer from './NotesRenderer';
import type { Page, Book } from '@/lib/types';

interface TranslationEditorProps {
  book: Book;
  page: Page;
  pages: Page[];
  currentIndex: number;
  onNavigate: (pageId: string) => void;
  onSave: (data: { ocr?: string; translation?: string; summary?: string }) => Promise<void>;
}

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  promptText: string;
  onPromptChange: (text: string) => void;
}

function SettingsModal({ isOpen, onClose, title, promptText, onPromptChange }: SettingsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="w-full max-w-lg mx-4 rounded-xl shadow-2xl" style={{ background: 'var(--bg-white)' }}>
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid var(--border-light)' }}>
          <h2 className="text-lg font-medium" style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', color: 'var(--text-primary)' }}>{title}</h2>
          <button onClick={onClose} className="hover:opacity-70 transition-opacity" style={{ color: 'var(--text-muted)' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div>
            <label className="label block mb-2">AI Model</label>
            <select
              className="w-full px-3 py-2.5 rounded-lg text-sm"
              style={{ border: '1px solid var(--border-medium)', background: 'var(--bg-white)', color: 'var(--text-primary)' }}
            >
              <option>Gemini 2.0 Flash</option>
            </select>
          </div>

          <div>
            <label className="label block mb-2">Prompt Template</label>
            <select
              className="w-full px-3 py-2.5 rounded-lg text-sm"
              style={{ border: '1px solid var(--border-medium)', background: 'var(--bg-white)', color: 'var(--text-primary)' }}
            >
              <option>Standard {title.replace(' Settings', '')}</option>
              <option>Scholarly {title.replace(' Settings', '')}</option>
            </select>
          </div>

          <div>
            <label className="label block mb-2">
              Prompt Text <span style={{ color: 'var(--text-faint)', fontWeight: 'normal', textTransform: 'none' }}>(use {'{language}'} as placeholders)</span>
            </label>
            <textarea
              value={promptText}
              onChange={(e) => onPromptChange(e.target.value)}
              className="w-full h-40 px-3 py-2.5 rounded-lg text-sm font-mono resize-none"
              style={{ border: '1px solid var(--border-medium)', background: 'var(--bg-cream)', color: 'var(--text-secondary)' }}
            />
          </div>

          <div className="flex justify-end">
            <button
              className="text-sm font-medium transition-opacity hover:opacity-70"
              style={{ color: 'var(--accent-rust)' }}
            >
              Save Changes
            </button>
          </div>

          <div className="pt-4" style={{ borderTop: '1px solid var(--border-light)' }}>
            <label className="label block mb-2">Create New Prompt</label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="New prompt name..."
                className="flex-1 px-3 py-2.5 rounded-lg text-sm"
                style={{ border: '1px solid var(--border-medium)', background: 'var(--bg-white)', color: 'var(--text-primary)' }}
              />
              <button
                className="px-4 py-2 text-sm font-medium transition-opacity hover:opacity-70"
                style={{ color: 'var(--text-muted)' }}
              >
                + Add
              </button>
            </div>
          </div>
        </div>

        <div className="p-5" style={{ borderTop: '1px solid var(--border-light)' }}>
          <button
            onClick={onClose}
            className="btn-primary w-full justify-center"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TranslationEditor({
  book,
  page,
  pages,
  currentIndex,
  onNavigate,
  onSave
}: TranslationEditorProps) {
  const [ocrText, setOcrText] = useState(page.ocr?.data || '');
  const [translationText, setTranslationText] = useState(page.translation?.data || '');
  const [summaryText, setSummaryText] = useState(page.summary?.data || '');

  const [processing, setProcessing] = useState<'ocr' | 'translation' | 'summary' | 'all' | null>(null);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<'read' | 'edit'>('read');

  const [showOcrSettings, setShowOcrSettings] = useState(false);
  const [showTranslationSettings, setShowTranslationSettings] = useState(false);

  const [ocrPrompt, setOcrPrompt] = useState('OCR the page in {language}. Return only the transcribed text.');
  const [translationPrompt, setTranslationPrompt] = useState('Translate the following {language} text to English. Preserve formatting and add [[notes]] for uncertainties.');

  const [copiedOcr, setCopiedOcr] = useState(false);
  const [copiedTranslation, setCopiedTranslation] = useState(false);

  const previousPage = currentIndex > 0 ? pages[currentIndex - 1] : null;
  const nextPage = currentIndex < pages.length - 1 ? pages[currentIndex + 1] : null;

  // Update state when page changes
  useEffect(() => {
    setOcrText(page.ocr?.data || '');
    setTranslationText(page.translation?.data || '');
    setSummaryText(page.summary?.data || '');
  }, [page]);

  const handleProcess = async (action: 'ocr' | 'translation' | 'summary' | 'all') => {
    setProcessing(action);
    try {
      const response = await fetch('/api/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pageId: page.id,
          action,
          imageUrl: page.photo,
          language: book.language || 'Latin',
          targetLanguage: 'English',
          ocrText: action === 'translation' ? ocrText : undefined,
          translatedText: action === 'summary' ? translationText : undefined,
          previousPageId: previousPage?.id,
          autoSave: true
        })
      });

      if (!response.ok) {
        throw new Error('Processing failed');
      }

      const result = await response.json();

      if (result.ocr) setOcrText(result.ocr);
      if (result.translation) setTranslationText(result.translation);
      if (result.summary) setSummaryText(result.summary);
    } catch (error) {
      console.error('Processing error:', error);
      alert('Processing failed. Please try again.');
    } finally {
      setProcessing(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave({
        ocr: ocrText,
        translation: translationText,
        summary: summaryText
      });
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = async (text: string, type: 'ocr' | 'translation') => {
    await navigator.clipboard.writeText(text);
    if (type === 'ocr') {
      setCopiedOcr(true);
      setTimeout(() => setCopiedOcr(false), 2000);
    } else {
      setCopiedTranslation(true);
      setTimeout(() => setCopiedTranslation(false), 2000);
    }
  };

  return (
    <div className="h-screen flex flex-col" style={{ background: 'var(--bg-warm)' }}>
      {/* Header */}
      <header className="px-6 py-4" style={{ background: 'var(--bg-white)', borderBottom: '1px solid var(--border-light)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <a href={`/book/${book.id}`} className="hover:opacity-70 transition-opacity" style={{ color: 'var(--text-muted)' }}>
              <ChevronLeft className="w-5 h-5" />
            </a>
            <div>
              <h1 className="text-xl font-medium" style={{ fontFamily: 'Cormorant Garamond, Georgia, serif', color: 'var(--text-primary)' }}>
                {book.display_title || book.title}
              </h1>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Page {currentIndex + 1} of {pages.length}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Mode Toggle */}
            <div className="flex items-center rounded-lg p-1" style={{ background: 'var(--bg-warm)' }}>
              <button
                onClick={() => setMode('read')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all"
                style={{
                  background: mode === 'read' ? 'var(--bg-white)' : 'transparent',
                  color: mode === 'read' ? 'var(--text-primary)' : 'var(--text-muted)',
                  boxShadow: mode === 'read' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                }}
              >
                <Eye className="w-4 h-4" />
                Read
              </button>
              <button
                onClick={() => setMode('edit')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all"
                style={{
                  background: mode === 'edit' ? 'var(--bg-white)' : 'transparent',
                  color: mode === 'edit' ? 'var(--text-primary)' : 'var(--text-muted)',
                  boxShadow: mode === 'edit' ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
                }}
              >
                <Pencil className="w-4 h-4" />
                Edit
              </button>
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-1 rounded-lg p-1" style={{ background: 'var(--bg-warm)' }}>
              <button
                onClick={() => previousPage && onNavigate(previousPage.id)}
                disabled={!previousPage}
                className="p-2 rounded-md transition-all disabled:opacity-30"
                style={{ color: 'var(--text-secondary)' }}
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>{currentIndex + 1} / {pages.length}</span>
              <button
                onClick={() => nextPage && onNavigate(nextPage.id)}
                disabled={!nextPage}
                className="p-2 rounded-md transition-all disabled:opacity-30"
                style={{ color: 'var(--text-secondary)' }}
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content - Three Columns */}
      <div className="flex-1 flex overflow-hidden">
        {/* Source Image Panel */}
        <div className="w-1/3 flex flex-col" style={{ background: 'var(--bg-cream)', borderRight: '1px solid var(--border-light)' }}>
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-light)' }}>
            <span className="label">Source</span>
            <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: 'rgba(124, 93, 181, 0.1)', color: 'var(--accent-violet)' }}>
              {book.language || 'Latin'}
            </span>
          </div>
          <div className="flex-1 overflow-auto p-4">
            <div className="relative aspect-[3/4] rounded-lg overflow-hidden" style={{ background: 'var(--bg-white)', border: '1px solid var(--border-light)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              {page.photo ? (
                <Image
                  src={page.photo}
                  alt={`Page ${page.page_number}`}
                  fill
                  className="object-contain"
                  sizes="33vw"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center" style={{ color: 'var(--text-muted)' }}>
                  No image available
                </div>
              )}
            </div>
          </div>
        </div>

        {/* OCR Panel */}
        <div className="w-1/3 flex flex-col" style={{ background: 'var(--bg-white)', borderRight: '1px solid var(--border-light)' }}>
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-light)' }}>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowOcrSettings(true)}
                className="btn-secondary"
                style={{ padding: '6px 12px' }}
              >
                <Settings className="w-4 h-4" />
                Settings
              </button>
              <button
                onClick={() => handleProcess('ocr')}
                disabled={processing !== null}
                className="btn-primary"
                style={{ padding: '6px 16px' }}
              >
                {processing === 'ocr' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : null}
                Run OCR
              </button>
            </div>
          </div>

          <div className="px-4 py-2 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-light)' }}>
            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>OCR Text</span>
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{ocrText.length} chars</span>
              <button
                onClick={() => copyToClipboard(ocrText, 'ocr')}
                className="p-1 transition-colors hover:opacity-70"
                style={{ color: 'var(--text-muted)' }}
              >
                {copiedOcr ? <Check className="w-4 h-4" style={{ color: 'var(--accent-sage)' }} /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4">
            {mode === 'edit' ? (
              <textarea
                value={ocrText}
                onChange={(e) => setOcrText(e.target.value)}
                className="w-full h-full p-0 border-0 resize-none leading-relaxed focus:outline-none focus:ring-0"
                style={{ fontFamily: 'Newsreader, Georgia, serif', color: 'var(--text-secondary)', fontSize: '16px', lineHeight: '1.75' }}
                placeholder="OCR text will appear here..."
              />
            ) : (
              <NotesRenderer text={ocrText} />
            )}
          </div>
        </div>

        {/* Translation Panel */}
        <div className="w-1/3 flex flex-col" style={{ background: 'var(--bg-white)' }}>
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-light)' }}>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowTranslationSettings(true)}
                className="btn-secondary"
                style={{ padding: '6px 12px' }}
              >
                <Settings className="w-4 h-4" />
                Settings
              </button>
              <button
                onClick={() => handleProcess('translation')}
                disabled={processing !== null || !ocrText}
                className="btn-primary"
                style={{ padding: '6px 16px' }}
              >
                {processing === 'translation' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : null}
                Translate
              </button>
            </div>
          </div>

          <div className="px-4 py-2 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-light)' }}>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>Translation</span>
              <span className="px-2 py-0.5 rounded text-xs font-medium" style={{ background: 'rgba(139, 154, 125, 0.15)', color: 'var(--accent-sage)' }}>
                English
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{translationText.length} chars</span>
              <button
                onClick={() => copyToClipboard(translationText, 'translation')}
                className="p-1 transition-colors hover:opacity-70"
                style={{ color: 'var(--text-muted)' }}
              >
                {copiedTranslation ? <Check className="w-4 h-4" style={{ color: 'var(--accent-sage)' }} /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto p-4">
            {mode === 'edit' ? (
              <textarea
                value={translationText}
                onChange={(e) => setTranslationText(e.target.value)}
                className="w-full h-full p-0 border-0 resize-none leading-relaxed focus:outline-none focus:ring-0"
                style={{ fontFamily: 'Newsreader, Georgia, serif', color: 'var(--text-secondary)', fontSize: '16px', lineHeight: '1.75' }}
                placeholder="Translation will appear here..."
              />
            ) : (
              <NotesRenderer text={translationText} />
            )}
          </div>
        </div>
      </div>

      {/* Settings Modals */}
      <SettingsModal
        isOpen={showOcrSettings}
        onClose={() => setShowOcrSettings(false)}
        title="OCR Settings"
        promptText={ocrPrompt}
        onPromptChange={setOcrPrompt}
      />

      <SettingsModal
        isOpen={showTranslationSettings}
        onClose={() => setShowTranslationSettings(false)}
        title="Translation Settings"
        promptText={translationPrompt}
        onPromptChange={setTranslationPrompt}
      />
    </div>
  );
}
