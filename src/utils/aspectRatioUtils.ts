/**
 * Aspect Ratio & Image Compatibility Utilities for Certificate Templates
 */

export interface AspectRatioCheckResult {
  isCompatible: boolean;
  currentRatio: number;
  uploadedRatio: number;
  ratioDiff: number;
  currentRatioFormatted: string;
  uploadedRatioFormatted: string;
  currentDimensionsFormatted: string;
  uploadedDimensionsFormatted: string;
  status: 'match' | 'mismatch';
  title: string;
  message: string;
}

/**
 * Calculates aspect ratio as Width / Height.
 * Returns 0 if height <= 0 or invalid.
 */
export function calculateAspectRatio(width: number, height: number): number {
  if (!width || !height || width <= 0 || height <= 0) return 0;
  return width / height;
}

/**
 * Formats an aspect ratio number as a readable string e.g. "1.41:1".
 */
export function formatAspectRatio(ratio: number): string {
  if (!ratio || !isFinite(ratio) || ratio <= 0) return '0.00:1';
  return `${ratio.toFixed(2)}:1`;
}

/**
 * Formats dimension pair into readable string e.g. "297 × 210 mm" or "1920 × 1080 px".
 */
export function formatDimensions(width: number, height: number, unit = 'px'): string {
  return `${Math.round(width * 10) / 10} × ${Math.round(height * 10) / 10} ${unit}`.trim();
}

/**
 * Compares an uploaded image's aspect ratio against the current template's canvas proportions.
 * Uses a default 1.5% tolerance (0.015) to accommodate minor pixel-rounding differences
 * between standard A4 exports (e.g. Canva 2000x1414, standard 3508x2480 vs 297x210 mm).
 */
export function checkAspectRatioCompatibility(
  currentWidth: number,
  currentHeight: number,
  uploadedWidth: number,
  uploadedHeight: number,
  tolerance = 0.015,
  currentUnit = 'mm'
): AspectRatioCheckResult {
  const currentRatio = calculateAspectRatio(currentWidth, currentHeight);
  const uploadedRatio = calculateAspectRatio(uploadedWidth, uploadedHeight);

  if (currentRatio <= 0 || uploadedRatio <= 0) {
    return {
      isCompatible: false,
      currentRatio: 0,
      uploadedRatio: 0,
      ratioDiff: 1,
      currentRatioFormatted: '0.00:1',
      uploadedRatioFormatted: '0.00:1',
      currentDimensionsFormatted: formatDimensions(currentWidth, currentHeight, currentUnit),
      uploadedDimensionsFormatted: formatDimensions(uploadedWidth, uploadedHeight, 'px'),
      status: 'mismatch',
      title: "Aspect Ratio Doesn't Match",
      message:
        'The new image has different proportions from your current certificate. Upload an image with matching proportions to preserve the existing layout accurately.',
    };
  }

  const ratioDiff = Math.abs(currentRatio - uploadedRatio) / currentRatio;
  const isCompatible = ratioDiff <= tolerance;

  if (isCompatible) {
    return {
      isCompatible: true,
      currentRatio,
      uploadedRatio,
      ratioDiff,
      currentRatioFormatted: formatAspectRatio(currentRatio),
      uploadedRatioFormatted: formatAspectRatio(uploadedRatio),
      currentDimensionsFormatted: formatDimensions(currentWidth, currentHeight, currentUnit),
      uploadedDimensionsFormatted: formatDimensions(uploadedWidth, uploadedHeight, 'px'),
      status: 'match',
      title: 'Looks good!',
      message:
        "Your new certificate design matches the current template's proportions. All existing elements will remain in their current positions.",
    };
  }

  return {
    isCompatible: false,
    currentRatio,
    uploadedRatio,
    ratioDiff,
    currentRatioFormatted: formatAspectRatio(currentRatio),
    uploadedRatioFormatted: formatAspectRatio(uploadedRatio),
    currentDimensionsFormatted: formatDimensions(currentWidth, currentHeight, currentUnit),
    uploadedDimensionsFormatted: formatDimensions(uploadedWidth, uploadedHeight, 'px'),
    status: 'mismatch',
    title: "Aspect Ratio Doesn't Match",
    message:
      'The new image has different proportions from your current certificate. Upload an image with matching proportions to preserve the existing layout accurately.',
  };
}

/**
 * Validates an image file's MIME type and size.
 */
export function validateImageFile(file: File, maxSizeBytes = 15 * 1024 * 1024): { isValid: boolean; error?: string } {
  const validMimes = ['image/png', 'image/jpeg', 'image/jpg'];
  const nameLower = file.name.toLowerCase();
  const hasValidExtension = nameLower.endsWith('.png') || nameLower.endsWith('.jpg') || nameLower.endsWith('.jpeg');

  if (!validMimes.includes(file.type.toLowerCase()) && !hasValidExtension) {
    return {
      isValid: false,
      error: 'Please select a PNG, JPG, or JPEG background image.',
    };
  }

  if (file.size > maxSizeBytes) {
    const maxMb = Math.round(maxSizeBytes / (1024 * 1024));
    return {
      isValid: false,
      error: `File size exceeds the ${maxMb}MB limit. Please choose a smaller image.`,
    };
  }

  return { isValid: true };
}

