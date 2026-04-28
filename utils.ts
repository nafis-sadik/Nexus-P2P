/**
 * Copies text to clipboard with a fallback for non-secure contexts (HTTP)
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    
    // Fallback using a hidden textarea
    const textArea = document.createElement("textarea");
    textArea.value = text;
    
    // Ensure textarea is not visible but still part of the DOM
    textArea.style.position = "fixed";
    textArea.style.left = "-999999px";
    textArea.style.top = "-999999px";
    document.body.appendChild(textArea);
    
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      textArea.remove();
      return true;
    } catch (err) {
      console.error('Fallback copy failed', err);
      textArea.remove();
      return false;
    }
  } catch (err) {
    console.error('Copy to clipboard failed', err);
    return false;
  }
}

/**
 * Generates a unique ID (UUID v4) with a fallback for non-secure contexts
 * where crypto.randomUUID() might be unavailable.
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  // Fallback implementation for non-secure contexts (HTTP)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
