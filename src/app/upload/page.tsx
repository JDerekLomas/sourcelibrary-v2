'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Upload,
  BookOpen,
  Loader2,
  CheckCircle,
  X,
  Image as ImageIcon,
  AlertCircle,
} from 'lucide-react';

interface UploadedPage {
  id: string;
  page_number: number;
  photo: string;
}

type UploadStep = 'metadata' | 'upload' | 'complete';

export default function UploadPage() {
  const router = useRouter();
  const [step, setStep] = useState<UploadStep>('metadata');

  // Book metadata
  const [title, setTitle] = useState('');
  const [displayTitle, setDisplayTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [language, setLanguage] = useState('German');
  const [published, setPublished] = useState('');

  // Upload state
  const [bookId, setBookId] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedPages, setUploadedPages] = useState<UploadedPage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Create book
  const handleCreateBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError(null);

    try {
      const response = await fetch('/api/books', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          display_title: displayTitle || undefined,
          author,
          language,
          published,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create book');
      }

      const book = await response.json();
      setBookId(book.id);
      setStep('upload');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create book');
    } finally {
      setCreating(false);
    }
  };

  // Handle file selection
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    // Sort files by name to maintain page order
    selectedFiles.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    setFiles(prev => [...prev, ...selectedFiles]);
  }, []);

  // Handle drag and drop
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    droppedFiles.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    setFiles(prev => [...prev, ...droppedFiles]);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  // Remove file from queue
  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Upload files
  const handleUpload = async () => {
    if (!bookId || files.length === 0) return;

    setUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('bookId', bookId);
      files.forEach(file => formData.append('files', file));

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Upload failed');
      }

      const result = await response.json();
      setUploadedPages(result.pages);
      setUploadProgress(100);
      setStep('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  // Languages commonly found in historical manuscripts
  const languages = ['German', 'Latin', 'French', 'English', 'Italian', 'Dutch', 'Greek', 'Hebrew', 'Arabic'];

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/" className="inline-flex items-center gap-2 text-stone-600 hover:text-stone-900">
            <ArrowLeft className="w-4 h-4" />
            Back to Library
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 ${step === 'metadata' ? 'text-amber-700' : 'text-green-700'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === 'metadata' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'
              }`}>
                {step === 'metadata' ? '1' : <CheckCircle className="w-5 h-5" />}
              </div>
              <span className="text-sm font-medium hidden sm:inline">Book Details</span>
            </div>
            <div className="w-12 h-px bg-stone-300" />
            <div className={`flex items-center gap-2 ${step === 'upload' ? 'text-amber-700' : step === 'complete' ? 'text-green-700' : 'text-stone-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === 'upload' ? 'bg-amber-100 text-amber-700' :
                step === 'complete' ? 'bg-green-100 text-green-700' : 'bg-stone-100'
              }`}>
                {step === 'complete' ? <CheckCircle className="w-5 h-5" /> : '2'}
              </div>
              <span className="text-sm font-medium hidden sm:inline">Upload Pages</span>
            </div>
            <div className="w-12 h-px bg-stone-300" />
            <div className={`flex items-center gap-2 ${step === 'complete' ? 'text-green-700' : 'text-stone-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step === 'complete' ? 'bg-green-100 text-green-700' : 'bg-stone-100'
              }`}>
                {step === 'complete' ? <CheckCircle className="w-5 h-5" /> : '3'}
              </div>
              <span className="text-sm font-medium hidden sm:inline">Done</span>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-800 font-medium">Error</p>
              <p className="text-red-700 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Step 1: Book Metadata */}
        {step === 'metadata' && (
          <div className="bg-white rounded-xl border border-stone-200 p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-stone-900">Add New Book</h1>
                <p className="text-sm text-stone-500">Enter the book's metadata</p>
              </div>
            </div>

            <form onSubmit={handleCreateBook} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Original Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder="e.g., Fons Sapientiae"
                  className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
                <p className="text-xs text-stone-500 mt-1">The title in the original language</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Display Title
                </label>
                <input
                  type="text"
                  value={displayTitle}
                  onChange={(e) => setDisplayTitle(e.target.value)}
                  placeholder="e.g., Fountain of Wisdom"
                  className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                />
                <p className="text-xs text-stone-500 mt-1">English title for display (optional)</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Author
                  </label>
                  <input
                    type="text"
                    value={author}
                    onChange={(e) => setAuthor(e.target.value)}
                    placeholder="e.g., Anonymous"
                    className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">
                    Date/Period
                  </label>
                  <input
                    type="text"
                    value={published}
                    onChange={(e) => setPublished(e.target.value)}
                    placeholder="e.g., c. 1650"
                    className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">
                  Source Language
                </label>
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full px-4 py-2.5 border border-stone-300 rounded-lg focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500"
                >
                  {languages.map(lang => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={creating || !title}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    Continue to Upload
                    <ArrowLeft className="w-5 h-5 rotate-180" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* Step 2: Upload Pages */}
        {step === 'upload' && (
          <div className="bg-white rounded-xl border border-stone-200 p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <Upload className="w-5 h-5 text-amber-700" />
              </div>
              <div>
                <h1 className="text-xl font-semibold text-stone-900">Upload Pages</h1>
                <p className="text-sm text-stone-500">Add page images to your book</p>
              </div>
            </div>

            {/* Drop zone */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="border-2 border-dashed border-stone-300 rounded-xl p-8 text-center hover:border-amber-400 transition-colors cursor-pointer"
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <input
                id="file-input"
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <ImageIcon className="w-12 h-12 text-stone-400 mx-auto mb-4" />
              <p className="text-stone-700 font-medium mb-1">
                Drop images here or click to browse
              </p>
              <p className="text-sm text-stone-500">
                Supports JPG, PNG, TIFF. Files will be sorted by name.
              </p>
            </div>

            {/* File list */}
            {files.length > 0 && (
              <div className="mt-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-stone-700">
                    {files.length} file{files.length !== 1 ? 's' : ''} selected
                  </h3>
                  <button
                    onClick={() => setFiles([])}
                    className="text-sm text-stone-500 hover:text-stone-700"
                  >
                    Clear all
                  </button>
                </div>
                <div className="max-h-64 overflow-y-auto border border-stone-200 rounded-lg divide-y divide-stone-200">
                  {files.map((file, index) => (
                    <div key={index} className="flex items-center gap-3 px-4 py-2.5">
                      <span className="text-xs font-mono text-stone-400 w-6">
                        {index + 1}
                      </span>
                      <span className="flex-1 text-sm text-stone-700 truncate">
                        {file.name}
                      </span>
                      <span className="text-xs text-stone-400">
                        {(file.size / 1024 / 1024).toFixed(1)} MB
                      </span>
                      <button
                        onClick={() => removeFile(index)}
                        className="p-1 text-stone-400 hover:text-stone-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload button */}
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setStep('metadata')}
                className="px-6 py-3 border border-stone-300 text-stone-700 rounded-lg font-medium hover:bg-stone-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading || files.length === 0}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-5 h-5" />
                    Upload {files.length} Page{files.length !== 1 ? 's' : ''}
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Complete */}
        {step === 'complete' && bookId && (
          <div className="bg-white rounded-xl border border-stone-200 p-6 sm:p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-semibold text-stone-900 mb-2">Book Created!</h1>
            <p className="text-stone-600 mb-6">
              Successfully uploaded {uploadedPages.length} page{uploadedPages.length !== 1 ? 's' : ''}.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href={`/book/${bookId}/prepare`}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 transition-colors"
              >
                Prepare Pages
              </Link>
              <Link
                href={`/book/${bookId}`}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 border border-stone-300 text-stone-700 rounded-lg font-medium hover:bg-stone-50 transition-colors"
              >
                View Book
              </Link>
              <button
                onClick={() => {
                  setStep('metadata');
                  setBookId(null);
                  setTitle('');
                  setDisplayTitle('');
                  setAuthor('');
                  setLanguage('German');
                  setPublished('');
                  setFiles([]);
                  setUploadedPages([]);
                }}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 text-stone-600 hover:text-stone-900 transition-colors"
              >
                Add Another Book
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
