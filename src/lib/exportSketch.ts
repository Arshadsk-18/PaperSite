// ==============================================================================
// PaperSite: Canvas & Sketch Exporter [HEART FILE: <= 40 lines of active code]
// File: src/lib/exportSketch.ts
// Converts Excalidraw canvas or uploaded sketch to an optimized, downscaled <=1024px base64 string.
// ==============================================================================

import { exportToBlob } from '@excalidraw/excalidraw';

// Exports the active Excalidraw canvas elements to a clean, downsized base64 PNG
export async function exportSketch(elements: readonly any[], appState: any, files: any): Promise<string> {
  const blob = await exportToBlob({
    elements,
    appState: { ...appState, exportBackground: true },
    files,
    mimeType: 'image/png',
  });
  return resizeBlobToBase64(blob);
}

// Downscales an uploaded paper sketch image file to at most 1024px with high-efficiency compression
export function exportUploadedImage(file: File): Promise<string> {
  return resizeBlobToBase64(file);
}

// Resizes image on an offscreen canvas to maximum 1024px preserving aspect ratio and contrast
export function resizeBlobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const maxDim = 1024;
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));

      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Fill white background to maintain contrast and avoid dark boxes on transparency
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      }

      // For photographs of sketches, JPEG 0.85 delivers sharp contrast and lines at ~100-250KB,
      // avoiding multi-megabyte PNG allocations. For PNG line art under 400KB, PNG is preserved.
      let dataUrl: string;
      if (blob.type === 'image/png') {
        const pngUrl = canvas.toDataURL('image/png');
        dataUrl = pngUrl.length < 400 * 1024 ? pngUrl : canvas.toDataURL('image/jpeg', 0.85);
      } else {
        dataUrl = canvas.toDataURL('image/jpeg', 0.85);
      }

      // Preserve full data URI containing accurate image MIME type
      resolve(dataUrl);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}
