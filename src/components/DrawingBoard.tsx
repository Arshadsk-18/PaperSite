// ==============================================================================
// PaperSite: Drawing Board Component
// File: src/components/DrawingBoard.tsx
// Interactive sketching canvas with pen, eraser, brush sizes, colors, undo/redo,
// clear confirmation, download, and high-DPI touch/mouse support.
// ==============================================================================

import React, { useRef, useState, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react';
import { Pen, Eraser, Undo2, Redo2, Trash2, Download, AlertTriangle, Check } from 'lucide-react';

export interface DrawingBoardRef {
  getSketchBase64: () => Promise<string>;
  hasStrokes: () => boolean;
  clear: () => void;
}

export interface DrawingBoardProps {
  onStrokeCountChange?: (hasStrokes: boolean) => void;
  disabled?: boolean;
}

const BRUSH_SIZES = [
  { label: 'Fine', size: 2 },
  { label: 'Medium', size: 4 },
  { label: 'Thick', size: 8 },
  { label: 'Marker', size: 14 },
];

const PALETTE = [
  { name: 'Charcoal', hex: '#1E293B' },
  { name: 'Forest', hex: '#1F3D33' },
  { name: 'Navy', hex: '#1E3A8A' },
  { name: 'Amber', hex: '#D97706' },
  { name: 'Crimson', hex: '#DC2626' },
];

const MAX_HISTORY = 20;

export const DrawingBoard = forwardRef<DrawingBoardRef, DrawingBoardProps>(
  ({ onStrokeCountChange, disabled = false }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
    const [brushSize, setBrushSize] = useState<number>(4);
    const [color, setColor] = useState<string>('#1E293B');

    const [undoStack, setUndoStack] = useState<ImageData[]>([]);
    const [redoStack, setRedoStack] = useState<ImageData[]>([]);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [strokeCount, setStrokeCount] = useState(0);

    const isDrawingRef = useRef(false);
    const lastPointRef = useRef<{ x: number; y: number } | null>(null);

    // Save snapshot of current canvas state into undo stack
    const pushSnapshot = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setUndoStack((prev) => [...prev.slice(-(MAX_HISTORY - 1)), imgData]);
      setRedoStack([]); // New action invalidates redo stack
    }, []);

    // Initialize & resize canvas with backing store scaling for retina screens
    const initCanvas = useCallback(() => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      const targetWidth = Math.max(300, Math.floor(rect.width));
      const targetHeight = Math.max(300, Math.floor(rect.height));

      // Save previous content if canvas was already sized
      const ctx = canvas.getContext('2d');
      let previousContent: HTMLCanvasElement | null = null;
      if (canvas.width > 0 && canvas.height > 0) {
        previousContent = document.createElement('canvas');
        previousContent.width = canvas.width;
        previousContent.height = canvas.height;
        previousContent.getContext('2d')?.drawImage(canvas, 0, 0);
      }

      canvas.width = targetWidth * dpr;
      canvas.height = targetHeight * dpr;
      canvas.style.width = `${targetWidth}px`;
      canvas.style.height = `${targetHeight}px`;

      if (ctx) {
        ctx.scale(dpr, dpr);
        // Paint white background
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, targetWidth, targetHeight);

        if (previousContent) {
          ctx.drawImage(previousContent, 0, 0, targetWidth, targetHeight);
        }
      }
    }, []);

    useEffect(() => {
      initCanvas();
      window.addEventListener('resize', initCanvas);
      return () => window.removeEventListener('resize', initCanvas);
    }, [initCanvas]);

    // Track stroke count for external components
    useEffect(() => {
      onStrokeCountChange?.(strokeCount > 0);
    }, [strokeCount, onStrokeCountChange]);

    // Undo / Redo Actions
    const handleUndo = useCallback(() => {
      if (undoStack.length === 0 || disabled) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Current state becomes top of redo stack
      const current = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setRedoStack((prev) => [...prev, current]);

      // Pop state from undo stack
      const previous = undoStack[undoStack.length - 1];
      setUndoStack((prev) => prev.slice(0, -1));
      ctx.putImageData(previous, 0, 0);

      setStrokeCount((c) => Math.max(0, c - 1));
    }, [undoStack, disabled]);

    const handleRedo = useCallback(() => {
      if (redoStack.length === 0 || disabled) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Current state becomes top of undo stack
      const current = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setUndoStack((prev) => [...prev, current]);

      // Pop state from redo stack
      const next = redoStack[redoStack.length - 1];
      setRedoStack((prev) => prev.slice(0, -1));
      ctx.putImageData(next, 0, 0);

      setStrokeCount((c) => c + 1);
    }, [redoStack, disabled]);

    // Keyboard shortcuts (Undo: Ctrl+Z, Redo: Ctrl+Y / Ctrl+Shift+Z)
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
          if (e.shiftKey) {
            handleRedo();
          } else {
            handleUndo();
          }
          e.preventDefault();
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
          handleRedo();
          e.preventDefault();
        } else if (e.key.toLowerCase() === 'p') {
          setTool('pen');
        } else if (e.key.toLowerCase() === 'e') {
          setTool('eraser');
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleUndo, handleRedo]);

    const getCanvasPoint = (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (disabled) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      canvas.setPointerCapture(e.pointerId);
      pushSnapshot();

      isDrawingRef.current = true;
      const pt = getCanvasPoint(e);
      lastPointRef.current = pt;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.beginPath();
        ctx.arc(pt.x, pt.y, brushSize / 2, 0, Math.PI * 2);
        ctx.fillStyle = tool === 'eraser' ? '#FFFFFF' : color;
        ctx.fill();
      }
    };

    const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawingRef.current || disabled) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      const currentPt = getCanvasPoint(e);
      const lastPt = lastPointRef.current;

      if (ctx && lastPt) {
        ctx.beginPath();
        ctx.moveTo(lastPt.x, lastPt.y);
        ctx.lineTo(currentPt.x, currentPt.y);
        ctx.strokeStyle = tool === 'eraser' ? '#FFFFFF' : color;
        ctx.lineWidth = tool === 'eraser' ? brushSize * 2.5 : brushSize;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
      }

      lastPointRef.current = currentPt;
    };

    const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!isDrawingRef.current) return;
      isDrawingRef.current = false;
      lastPointRef.current = null;
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Pointer was not captured
      }
      setStrokeCount((c) => c + 1);
    };



    const handleClearCanvas = () => {
      pushSnapshot();
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const dpr = window.devicePixelRatio || 1;
          ctx.save();
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.restore();
          ctx.scale(dpr, dpr);
        }
      }
      setStrokeCount(0);
      setShowClearConfirm(false);
    };

    const handleDownloadSketch = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const link = document.createElement('a');
      link.download = `papersite-sketch-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };

    // Export scaled 1024px PNG Base64 for the AI pipeline
    const exportSketchBase64 = async (): Promise<string> => {
      const canvas = canvasRef.current;
      if (!canvas) throw new Error('Canvas element unavailable');

      return new Promise<string>((resolve) => {
        const scale = Math.min(1, 1024 / Math.max(canvas.width, canvas.height));
        const offscreen = document.createElement('canvas');
        offscreen.width = Math.max(1, Math.round(canvas.width * scale));
        offscreen.height = Math.max(1, Math.round(canvas.height * scale));

        const ctx = offscreen.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, offscreen.width, offscreen.height);
          ctx.drawImage(canvas, 0, 0, offscreen.width, offscreen.height);
        }

        const dataUrl = offscreen.toDataURL('image/png');
        resolve(dataUrl); // Return full data URI preserving image/png MIME type
      });
    };

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      getSketchBase64: exportSketchBase64,
      hasStrokes: () => strokeCount > 0,
      clear: handleClearCanvas,
    }));

    return (
      <div className="flex-1 flex flex-col min-h-0 bg-[#F4F6F4] relative select-none">
        {/* Top Drawing Toolbar */}
        <div className="h-12 px-3 lg:px-4 bg-white border-b border-[#E3E8E4] flex items-center justify-between text-xs gap-2 shrink-0 overflow-x-auto">
          {/* Tool Selector: Pen vs Eraser */}
          <div className="flex items-center gap-1 bg-[#F4F6F4] p-0.5 rounded-lg border border-[#E3E8E4] shrink-0">
            <button
              type="button"
              onClick={() => setTool('pen')}
              disabled={disabled}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                tool === 'pen'
                  ? 'bg-white text-[#1F3D33] shadow-xs'
                  : 'text-[#5E6B63] hover:text-[#14221B]'
              }`}
              title="Pen tool (Shortcut: P)"
            >
              <Pen className="w-3.5 h-3.5" />
              <span>Pen</span>
            </button>
            <button
              type="button"
              onClick={() => setTool('eraser')}
              disabled={disabled}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                tool === 'eraser'
                  ? 'bg-white text-[#1F3D33] shadow-xs'
                  : 'text-[#5E6B63] hover:text-[#14221B]'
              }`}
              title="Eraser tool (Shortcut: E)"
            >
              <Eraser className="w-3.5 h-3.5" />
              <span>Eraser</span>
            </button>
          </div>

          {/* Stroke Width Selector */}
          <div className="flex items-center gap-1 border-l border-r border-[#E3E8E4] px-2 shrink-0">
            {BRUSH_SIZES.map((b) => (
              <button
                key={b.size}
                type="button"
                onClick={() => setBrushSize(b.size)}
                disabled={disabled}
                className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors cursor-pointer ${
                  brushSize === b.size
                    ? 'bg-[#1F3D33] text-white shadow-2xs'
                    : 'text-[#5E6B63] hover:bg-[#F4F6F4]'
                }`}
                title={`Brush size: ${b.label} (${b.size}px)`}
              >
                <span
                  className="rounded-full bg-current"
                  style={{ width: Math.max(3, b.size), height: Math.max(3, b.size) }}
                />
              </button>
            ))}
          </div>

          {/* Color Palette (Pen mode only) */}
          <div className="flex items-center gap-1.5 shrink-0">
            {PALETTE.map((p) => (
              <button
                key={p.hex}
                type="button"
                onClick={() => {
                  setColor(p.hex);
                  setTool('pen');
                }}
                disabled={disabled}
                className={`w-5 h-5 rounded-full transition-transform cursor-pointer relative flex items-center justify-center ${
                  color === p.hex && tool === 'pen' ? 'ring-2 ring-offset-1 ring-[#1F3D33] scale-110' : 'hover:scale-105'
                }`}
                style={{ backgroundColor: p.hex }}
                title={`Color: ${p.name}`}
              >
                {color === p.hex && tool === 'pen' && (
                  <Check className="w-2.5 h-2.5 text-white stroke-[3]" />
                )}
              </button>
            ))}
          </div>

          <div className="flex-1" />

          {/* Undo / Redo / Clear / Download Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleUndo}
              disabled={undoStack.length === 0 || disabled}
              className="p-1.5 rounded-md text-[#5E6B63] hover:bg-[#F4F6F4] hover:text-[#14221B] disabled:opacity-40 transition-colors cursor-pointer"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleRedo}
              disabled={redoStack.length === 0 || disabled}
              className="p-1.5 rounded-md text-[#5E6B63] hover:bg-[#F4F6F4] hover:text-[#14221B] disabled:opacity-40 transition-colors cursor-pointer"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleDownloadSketch}
              disabled={disabled}
              className="p-1.5 rounded-md text-[#5E6B63] hover:bg-[#F4F6F4] hover:text-[#14221B] disabled:opacity-40 transition-colors cursor-pointer"
              title="Download sketch PNG"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              disabled={strokeCount === 0 || disabled}
              className="p-1.5 rounded-md text-red-600 hover:bg-red-50 disabled:opacity-40 transition-colors cursor-pointer ml-1"
              title="Clear canvas"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Clear Canvas Confirmation Banner */}
        {showClearConfirm && (
          <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-between text-xs text-amber-900 z-10 shrink-0">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Clear the entire sketch? This will reset all current strokes.</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleClearCanvas}
                className="px-2.5 py-1 bg-red-600 text-white rounded text-[11px] font-medium hover:bg-red-700 cursor-pointer"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="px-2.5 py-1 bg-white border border-[#E3E8E4] text-[#14221B] rounded text-[11px] font-medium hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Interactive Drawing Canvas Area */}
        <div ref={containerRef} className="flex-1 w-full h-full relative cursor-crosshair overflow-hidden touch-none">
          <canvas
            ref={canvasRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            className="w-full h-full block"
          />

          {/* Empty Canvas Guidance Helper */}
          {strokeCount === 0 && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="bg-white/85 backdrop-blur-xs border border-[#E3E8E4] rounded-lg px-4 py-3 text-center shadow-xs max-w-xs">
                <Pen className="w-5 h-5 text-[#2F6B4F] mx-auto mb-1.5" />
                <p className="text-xs font-semibold text-[#14221B]">Draw your layout boxes</p>
                <p className="text-[11px] text-[#5E6B63] mt-0.5">
                  Sketch rough wireframe boxes for your header, services, menu, or booking form.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }
);

DrawingBoard.displayName = 'DrawingBoard';
