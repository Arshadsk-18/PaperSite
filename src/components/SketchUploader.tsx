// ==============================================================================
// PaperSite: Sketch Uploader Component
// File: src/components/SketchUploader.tsx
// Drag-and-drop & file selection with size validation, preview, and replace/remove controls.
// ==============================================================================

import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, Image as ImageIcon, Trash2, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';

export interface SketchUploaderProps {
  onFileSelect: (file: File | null) => void;
  selectedFile: File | null;
  previewUrl: string | null;
  disabled?: boolean;
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

export const SketchUploader: React.FC<SketchUploaderProps> = ({
  onFileSelect,
  selectedFile,
  previewUrl,
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  // Prevent browser navigation when files are dropped outside the target area
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => e.preventDefault();
    const handleDrop = (e: DragEvent) => e.preventDefault();

    window.addEventListener('dragover', handleDragOver);
    window.addEventListener('drop', handleDrop);

    return () => {
      window.removeEventListener('dragover', handleDragOver);
      window.removeEventListener('drop', handleDrop);
    };
  }, []);

  const validateAndSelectFile = (file: File) => {
    setErrorMessage(null);

    if (!ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
      setErrorMessage('Unsupported file format. Please upload a PNG, JPG, or WebP image.');
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      setErrorMessage(`File is too large (${sizeMb} MB). Maximum allowed size is 10 MB.`);
      return;
    }

    onFileSelect(file);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSelectFile(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSelectFile(e.target.files[0]);
    }
    // Reset input so same file can be re-selected if removed
    e.target.value = '';
  };

  const handleRemove = () => {
    setErrorMessage(null);
    onFileSelect(null);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex-1 flex flex-col p-4 lg:p-6 overflow-y-auto">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/jpg,image/webp"
        className="hidden"
        onChange={handleInputChange}
        disabled={disabled}
      />

      {/* Error Banner */}
      {errorMessage && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-800">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold">Upload failed: </span>
            {errorMessage}
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-red-500 hover:text-red-800 font-medium cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {selectedFile && previewUrl ? (
        /* Image Preview & Controls */
        <div className="flex-1 flex flex-col min-h-0 bg-white border border-[#E3E8E4] rounded-xl p-4 shadow-2xs">
          <div className="flex items-center justify-between pb-3 border-b border-[#E3E8E4] mb-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#2F6B4F]" />
              <span className="text-xs font-semibold text-[#14221B]">Sketch Staged for Generation</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={disabled}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-[#E3E8E4] text-[#14221B] hover:bg-[#F4F6F4] transition-colors cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className="w-3 h-3 text-[#5E6B63]" />
                Replace
              </button>
              <button
                type="button"
                onClick={handleRemove}
                disabled={disabled}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border border-red-200 text-red-700 hover:bg-red-50 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3 h-3 text-red-500" />
                Remove
              </button>
            </div>
          </div>

          {/* Preview Image Frame */}
          <div className="flex-1 min-h-[280px] bg-[#F9FAF9] rounded-lg border border-[#E3E8E4] flex items-center justify-center p-3 overflow-hidden">
            <img
              src={previewUrl}
              alt="Uploaded sketch preview"
              className="max-h-full max-w-full object-contain rounded shadow-2xs"
            />
          </div>

          {/* File Metadata */}
          <div className="mt-3 pt-3 border-t border-[#E3E8E4] flex items-center justify-between text-xs text-[#5E6B63]">
            <div className="flex items-center gap-1.5 truncate max-w-[70%]">
              <ImageIcon className="w-3.5 h-3.5 text-[#5E6B63] shrink-0" />
              <span className="truncate font-medium text-[#14221B]">{selectedFile.name}</span>
            </div>
            <span>{formatFileSize(selectedFile.size)}</span>
          </div>
        </div>
      ) : (
        /* Empty Upload Dropzone */
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
          className={`flex-1 flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed transition-all cursor-pointer min-h-[340px] text-center select-none ${
            isDragging
              ? 'border-[#2F6B4F] bg-[#F0FDF4] scale-[0.99]'
              : 'border-[#CBD5E1] hover:border-[#2F6B4F] bg-white hover:bg-[#FAFAFA]'
          } ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          <div className="w-14 h-14 rounded-full bg-[#F4F6F4] flex items-center justify-center mb-4 text-[#2F6B4F]">
            <UploadCloud className="w-7 h-7" />
          </div>

          <h3 className="text-sm font-semibold text-[#14221B] mb-1">
            Upload photo or scan of your paper sketch
          </h3>
          <p className="text-xs text-[#5E6B63] max-w-sm mb-4">
            Drag and drop your image file here, or click to browse from your device
          </p>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#1F3D33] text-white text-xs font-medium hover:bg-[#2F6B4F] transition-colors shadow-2xs">
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Select Image File</span>
          </div>

          <div className="mt-6 flex items-center gap-3 text-[11px] text-[#5E6B63]">
            <span>PNG, JPG, or JPEG</span>
            <span>•</span>
            <span>Up to 10 MB</span>
            <span>•</span>
            <span>Hand-drawn or printed</span>
          </div>
        </div>
      )}
    </div>
  );
};
