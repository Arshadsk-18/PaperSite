// ==============================================================================
// PaperSite: Canvas & Sketch Exporter [HEART FILE: <= 35 lines of active code]
// File: src/lib/exportSketch.ts
// Converts Excalidraw canvas or uploaded file to a downscaled 1024px PNG base64 string.
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

// Downscales an uploaded paper sketch image file to at most 1024px
export function exportUploadedImage(file: File): Promise<string> {
  return resizeBlobToBase64(file);
}

// Resizes image on an offscreen canvas to maximum 1024px and strips the data URL prefix
function resizeBlobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, 1024 / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/png').split(',')[1]);
    };
    img.onerror = reject;
    img.src = url;
  });
}
