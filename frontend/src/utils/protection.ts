/**
 * ============================================================
 *  Copyright (c) 2026 HadesCore Technologies. All Rights Reserved.
 *  APEX LMS - Proprietary & Confidential
 * ============================================================
 */

export function initConsoleWarning(): void {
  const styles = {
    title: 'font-size:18px;font-weight:900;color:#ef4444;text-shadow:0 0 8px #ef444488;',
    body:  'font-size:13px;color:#fbbf24;font-weight:600;',
    fine:  'font-size:11px;color:#94a3b8;',
  };

  console.log('%c STOP - HadesCore Apex LMS', styles.title);
  console.log(
    '%cThis is a proprietary application owned by HadesCore Technologies.\n' +
    'Unauthorized access, reverse-engineering, cloning, or redistribution\n' +
    'of any part of this software is strictly prohibited and legally actionable.\n' +
    '(c) 2026 HadesCore Technologies. All Rights Reserved.',
    styles.body
  );
  console.log('%cIf you are a legitimate developer, contact: admin@hadescore.com', styles.fine);

  const _clear = console.clear.bind(console);
  console.clear = () => {
    _clear();
    console.log('%c HadesCore Apex LMS - Proprietary Software', styles.title);
  };
}

export function initDevToolsGuard(onOpen?: () => void): () => void {
  let devtoolsOpen = false;
  const threshold = 160;

  const check = () => {
    const widthDiff  = window.outerWidth  - window.innerWidth;
    const heightDiff = window.outerHeight - window.innerHeight;
    const opened = widthDiff > threshold || heightDiff > threshold;

    if (opened && !devtoolsOpen) {
      devtoolsOpen = true;
      onOpen?.();
    } else if (!opened && devtoolsOpen) {
      devtoolsOpen = false;
    }
  };

  const interval = setInterval(check, 1500);
  return () => clearInterval(interval);
}

export function disableContextMenu(): () => void {
  const handler = (e: MouseEvent) => {
    const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
    if (!['input', 'textarea'].includes(tag)) {
      e.preventDefault();
    }
  };
  document.addEventListener('contextmenu', handler);
  return () => document.removeEventListener('contextmenu', handler);
}

export function disableInspectShortcuts(): () => void {
  const handler = (e: KeyboardEvent) => {
    const ctrl  = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;

    if (
      e.key === 'F12' ||
      (ctrl && shift && ['i', 'I', 'j', 'J', 'c', 'C'].includes(e.key)) ||
      (ctrl && ['u', 'U'].includes(e.key))
    ) {
      e.preventDefault();
      e.stopPropagation();
    }
  };
  document.addEventListener('keydown', handler, true);
  return () => document.removeEventListener('keydown', handler, true);
}

export function disableContentExfiltrationShortcuts(): () => void {
  const handler = (e: KeyboardEvent) => {
    const ctrl = e.ctrlKey || e.metaKey;
    const tag  = (e.target as HTMLElement)?.tagName?.toLowerCase();
    const editable = ['input', 'textarea'].includes(tag) || (e.target as HTMLElement)?.isContentEditable;

    if (ctrl && ['s', 'S', 'p', 'P'].includes(e.key)) {
      e.preventDefault();
    }
    if (ctrl && ['a', 'A'].includes(e.key) && !editable) {
      e.preventDefault();
    }
  };
  document.addEventListener('keydown', handler, true);
  return () => document.removeEventListener('keydown', handler, true);
}

// ─── Screenshot & Screen Recording Protection ───────────────────────────────

let _screenshotOverlay: HTMLDivElement | null = null;

function showScreenshotBlockOverlay(): void {
  if (_screenshotOverlay) return;
  const el = document.createElement('div');
  el.id = 'apex-screenshot-block';
  el.style.cssText = [
    'position:fixed',
    'inset:0',
    'z-index:2147483647',
    'background:#000',
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'flex-direction:column',
    'gap:16px',
    'pointer-events:none',
  ].join(';');

  const icon = document.createElement('div');
  icon.textContent = '🔒';
  icon.style.cssText = 'font-size:64px;';

  const title = document.createElement('div');
  title.textContent = 'PROTECTED CONTENT';
  title.style.cssText = 'font-size:22px;font-weight:900;color:#ef4444;letter-spacing:3px;font-family:sans-serif;';

  const sub = document.createElement('div');
  sub.textContent = 'Screenshot & screen recording is not permitted.';
  sub.style.cssText = 'font-size:14px;color:#94a3b8;font-family:sans-serif;';

  el.appendChild(icon);
  el.appendChild(title);
  el.appendChild(sub);
  document.body.appendChild(el);
  _screenshotOverlay = el;
}

function hideScreenshotBlockOverlay(): void {
  if (_screenshotOverlay) {
    _screenshotOverlay.remove();
    _screenshotOverlay = null;
  }
}

/**
 * Blocks common Windows screenshot keys:
 *  - PrintScreen (PrtScn)
 *  - Alt + PrintScreen
 *  - Win + PrintScreen (opens Snipping Tool region on some builds)
 *  - Win + Shift + S (Snipping Tool)
 *  - Ctrl + PrintScreen
 * Shows a black overlay while the key is held down.
 */
export function disableScreenshotKeys(): () => void {
  const SCREENSHOT_KEYS = new Set(['PrintScreen', 'print', 'snapshot']);

  const onKeyDown = (e: KeyboardEvent) => {
    const key = e.key?.toLowerCase() ?? '';
    const win = e.metaKey; // Windows key (Meta)
    const shift = e.shiftKey;

    // PrtScn variants
    if (SCREENSHOT_KEYS.has(e.key) || key === 'printscreen') {
      e.preventDefault();
      e.stopImmediatePropagation();
      showScreenshotBlockOverlay();
      return;
    }

    // Win + Shift + S  → Snipping Tool
    if (win && shift && (e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      e.stopImmediatePropagation();
      showScreenshotBlockOverlay();
      return;
    }

    // Win + PrintScreen
    if (win && (SCREENSHOT_KEYS.has(e.key) || key === 'printscreen')) {
      e.preventDefault();
      e.stopImmediatePropagation();
      showScreenshotBlockOverlay();
      return;
    }
  };

  const onKeyUp = (e: KeyboardEvent) => {
    const key = e.key?.toLowerCase() ?? '';
    if (SCREENSHOT_KEYS.has(e.key) || key === 'printscreen') {
      hideScreenshotBlockOverlay();
    }
    // Also hide if Win or Shift released after showing
    if (e.key === 'Meta' || (e.shiftKey === false && e.key === 'Shift')) {
      hideScreenshotBlockOverlay();
    }
  };

  document.addEventListener('keydown', onKeyDown, true);
  document.addEventListener('keyup', onKeyUp, true);

  return () => {
    document.removeEventListener('keydown', onKeyDown, true);
    document.removeEventListener('keyup', onKeyUp, true);
    hideScreenshotBlockOverlay();
  };
}

/**
 * Screen Recording / Tab Visibility Protection:
 * When the tab becomes hidden (user Alt+Tabs or a recorder is overlaying),
 * or when the Page Visibility API signals the page is hidden,
 * blur content and show a black overlay as a deterrent.
 *
 * Note: Browser APIs cannot detect external screen recorders. This is a
 * deterrent that makes the content black/unreadable in the recording window.
 */
export function initScreenRecordingGuard(): () => void {
  // Inject CSS that blurs/hides content when the browser window loses focus
  const styleId = 'apex-rec-guard-style';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* When OS screenshot or screen share dialog is active the window may not
         lose focus, so we additionally rely on a periodic visiblity check */
      @media print {
        body * { visibility: hidden !important; }
        body::after {
          content: "PROTECTED CONTENT - HadesCore Apex LMS";
          visibility: visible !important;
          position: fixed;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 32px;
          font-weight: 900;
          color: #ef4444;
          background: #000;
          z-index: 2147483647;
        }
      }
    `;
    document.head.appendChild(style);
  }

  // Visibility Change – page hidden (user switches tab or screen recorder captures another window)
  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      showScreenshotBlockOverlay();
    } else {
      // Small delay so overlay doesn't flash immediately on refocus
      setTimeout(hideScreenshotBlockOverlay, 300);
    }
  };

  // Window blur — user switches focus away from browser window
  const onBlur = () => {
    // Short debounce – don't block instant Alt+Tab back
    setTimeout(() => {
      if (!document.hasFocus()) {
        showScreenshotBlockOverlay();
      }
    }, 200);
  };

  const onFocus = () => {
    setTimeout(hideScreenshotBlockOverlay, 300);
  };

  document.addEventListener('visibilitychange', onVisibilityChange);
  window.addEventListener('blur', onBlur);
  window.addEventListener('focus', onFocus);

  return () => {
    document.removeEventListener('visibilitychange', onVisibilityChange);
    window.removeEventListener('blur', onBlur);
    window.removeEventListener('focus', onFocus);
    hideScreenshotBlockOverlay();
    document.getElementById(styleId)?.remove();
  };
}

export function initAppProtection(): () => void {
  initConsoleWarning();

  const cleanupDevTools    = initDevToolsGuard();
  const cleanupContext     = disableContextMenu();
  const cleanupInspect     = disableInspectShortcuts();
  const cleanupExfil       = disableContentExfiltrationShortcuts();
  const cleanupScreenshot  = disableScreenshotKeys();
  const cleanupRecGuard    = initScreenRecordingGuard();

  return () => {
    cleanupDevTools();
    cleanupContext();
    cleanupInspect();
    cleanupExfil();
    cleanupScreenshot();
    cleanupRecGuard();
  };
}
