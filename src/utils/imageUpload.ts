/**
 * Utility to process, resize, and compress user-uploaded photos
 * for optimal performance and Firestore document storage limits.
 */

export function compressAndReadImageFile(
  file: File,
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.8
): Promise<string> {
  return new Promise((resolve) => {
    // If not standard image or file is empty, still attempt FileReader fallback
    const reader = new FileReader();

    reader.onload = (readerEvent) => {
      const rawResult = readerEvent.target?.result as string;
      if (!rawResult) {
        resolve('');
        return;
      }

      // Try canvas optimization
      try {
        const img = new window.Image();

        img.onload = () => {
          try {
            let width = img.naturalWidth || img.width;
            let height = img.naturalHeight || img.height;

            if (!width || !height) {
              resolve(rawResult);
              return;
            }

            // Calculate aspect-preserving dimensions
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

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(rawResult);
              return;
            }

            ctx.drawImage(img, 0, 0, width, height);
            const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);

            // If compressed data URL is valid and non-empty, use it; otherwise use raw
            if (compressedDataUrl && compressedDataUrl.length > 50) {
              resolve(compressedDataUrl);
            } else {
              resolve(rawResult);
            }
          } catch (canvasErr) {
            console.warn('Canvas resize failed, falling back to original image data:', canvasErr);
            resolve(rawResult);
          }
        };

        img.onerror = (err) => {
          console.warn('Image onload error, falling back to original data URL:', err);
          resolve(rawResult);
        };

        img.src = rawResult;
      } catch (e) {
        console.warn('Image processing fallback:', e);
        resolve(rawResult);
      }
    };

    reader.onerror = () => {
      console.error('FileReader error on file read');
      resolve('');
    };

    reader.readAsDataURL(file);
  });
}
