import { getBaseURL } from '../services/api';
import toast from 'react-hot-toast';

/**
 * Robust direct file downloader.
 * Triggers an immediate browser file download directly to disk,
 * preventing files (PDFs, PPTs, ZIPs, certificates, homework guidelines)
 * from opening or previewing in a new tab.
 */
export async function downloadFileDirectly(fileUrl: string, customFileName?: string) {
  if (!fileUrl || typeof fileUrl !== 'string') {
    toast.error('Download link not available.');
    return;
  }

  const trimmed = fileUrl.trim();
  const apiBase = getBaseURL().replace(/\/+$/, '');

  // Extract or generate filename
  let filename = customFileName || '';
  if (!filename) {
    const urlParts = trimmed.split('?')[0].split('/');
    const lastPart = urlParts[urlParts.length - 1];
    filename = lastPart || 'download_file.pdf';
  }

  // Ensure extension
  if (!filename.includes('.')) {
    filename += '.pdf';
  }

  const toastId = toast.loading(`Downloading ${filename}...`);

  try {
    // 1. Resolve effective URL
    let effectiveUrl = trimmed;
    if (trimmed.startsWith('/media/')) {
      const backendOrigin = apiBase.replace(/\/api\/?$/, '');
      effectiveUrl = `${backendOrigin}${trimmed}`;
    }

    // 2. Build backend proxy URL to guarantee Content-Disposition: attachment
    const proxyDownloadUrl = `${apiBase}/core/download/?url=${encodeURIComponent(effectiveUrl)}&name=${encodeURIComponent(filename)}`;

    // 3. Attempt direct fetch to blob
    try {
      const resp = await fetch(proxyDownloadUrl, { credentials: 'omit' });
      if (resp.ok) {
        const blob = await resp.blob();
        const objectUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = objectUrl;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(objectUrl);
        toast.success('Download complete.', { id: toastId });
        return;
      }
    } catch {
      // Fetch threw (CORS or network), proceed to iframe fallback
    }

    // 4. Fallback: Invisible iframe trigger (never opens a new tab)
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    iframe.src = proxyDownloadUrl;
    document.body.appendChild(iframe);
    setTimeout(() => {
      try {
        document.body.removeChild(iframe);
      } catch {}
    }, 15000);

    toast.success('Download started.', { id: toastId });
  } catch (err) {
    console.error('Direct download error:', err);
    toast.error('Download failed.', { id: toastId });
  }
}
