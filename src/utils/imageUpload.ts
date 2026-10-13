/**
 * Utility to process, resize, and compress user-uploaded photos
 * for optimal performance, instant rendering, and guaranteed Firestore document storage limits.
 */

export async function compressAndReadImageFile(
  file: File,
  maxWidth = 600,
  maxHeight = 600,
  quality = 0.76
): Promise<string> {
  if (!file) {
    throw new Error('No file provided for upload.');
  }

  // Create an HTML Image element from either ObjectURL or FileReader
  const img = await loadImageElement(file);

  try {
    let width = img.naturalWidth || img.width || 600;
    let height = img.naturalHeight || img.height || 600;

    // Calculate aspect ratio preserving dimensions
    if (width > height) {
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
    } else {
      if (height > maxHeight) {
        width = Math.round((width * maxHeight) / height);
        height = maxHeight;
      }
    }

    // Minimum sanity bounds
    width = Math.max(10, width);
    height = Math.max(10, height);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Unable to initialize canvas rendering context.');
    }

    // Fill white background first (so transparent PNGs don't become black boxes in JPEG)
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);

    // Smooth image rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    ctx.drawImage(img, 0, 0, width, height);

    // Initial compression
    let compressedDataUrl = canvas.toDataURL('image/jpeg', quality);

    // Safety check: if still larger than ~180KB (approx 240,000 chars), recompress to ensure Firestore safety
    if (compressedDataUrl.length > 240000) {
      const smallerCanvas = document.createElement('canvas');
      const scale = 0.75;
      smallerCanvas.width = Math.round(width * scale);
      smallerCanvas.height = Math.round(height * scale);
      const sCtx = smallerCanvas.getContext('2d');
      if (sCtx) {
        sCtx.fillStyle = '#FFFFFF';
        sCtx.fillRect(0, 0, smallerCanvas.width, smallerCanvas.height);
        sCtx.drawImage(canvas, 0, 0, smallerCanvas.width, smallerCanvas.height);
        compressedDataUrl = smallerCanvas.toDataURL('image/jpeg', 0.65);
      }
    }

    if (!compressedDataUrl || compressedDataUrl.length < 50) {
      throw new Error('Failed to encode image data.');
    }

    return compressedDataUrl;
  } finally {
    // Clean up if object URL was used
    if (img.src && img.src.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(img.src);
      } catch {
        // Ignore revoke errors
      }
    }
  }
}

/**
 * Loads a File into an HTMLImageElement using ObjectURL first, FileReader fallback
 */
function loadImageElement(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();

    img.onload = () => resolve(img);
    img.onerror = () => {
      // If ObjectURL fails (rare), attempt FileReader fallback
      if (img.src && img.src.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(img.src);
        } catch {
          // Ignore
        }
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const fallbackImg = new window.Image();
        fallbackImg.onload = () => resolve(fallbackImg);
        fallbackImg.onerror = () =>
          reject(new Error('The uploaded file could not be decoded as an image. Please try a different photo.'));
        fallbackImg.src = e.target?.result as string;
      };
      reader.onerror = () =>
        reject(new Error('Failed to read photo file from device. Please check permissions and try again.'));
      reader.readAsDataURL(file);
    };

    // Try standard ObjectURL first for maximum performance
    try {
      const objectUrl = URL.createObjectURL(file);
      img.src = objectUrl;
    } catch {
      // Fallback directly to FileReader if createObjectURL isn't supported
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = () =>
        reject(new Error('Failed to read file data. Please select another image.'));
      reader.readAsDataURL(file);
    }
  });
}
