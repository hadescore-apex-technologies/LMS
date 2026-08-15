/**
 * ============================================================
 *  Copyright (c) 2026 HadesCore Technologies. All Rights Reserved.
 *  APEX LMS - Proprietary & Confidential
 * ============================================================
 */

/**
 * Prints a styled ownership warning in the browser console.
 * Also overwrites console.clear so it cannot be hidden.
 */
export function initConsoleWarning(): void {
  const styles = {
    title: "font-size:18px;font-weight:900;color:#ef4444;text-shadow:0 0 8px #ef444488;",
    body:  "font-size:13px;color:#fbbf24;font-weight:600;",
    fine:  "font-size:11px;color:#94a3b8;",
  };

  console.log("%c?  STOP — HadesCore Apex LMS", styles.title);
  console.log(
    "%cThis is a proprietary application owned by HadesCore Technologies.\n" +
    "Unauthorized access, reverse-engineering, cloning, or redistribution\n" +
    "of any part of this software is strictly prohibited and legally actionable.\n" +
    "© 2026 HadesCore Technologies. All Rights Reserved.",
    styles.body
  );
  console.log("%cIf you are a legitimate developer, contact: admin@hadescore.com", styles.fine);

  // Prevent clearing the warning
  const _clear = console.clear.bind(console);
  console.clear = () => {
    _clear();
    console.log("%c?  HadesCore Apex LMS — Proprietary Software", styles.title);
  };
}

/**
 * Detects common DevTools open signals and triggers a callback.
 * Uses the element size trick (reliable cross-browser).
 */
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

/**
 * Blocks right-click context menu on the entire app.
 */
export function disableContextMenu(): () => void {
  const handler = (e: MouseEvent) => {
    // Allow right-click only on input/textarea so users can paste
    const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
    if (!["input", "textarea"].includes(tag)) {
      e.preventDefault();
    }
  };
  document.addEventListener("contextmenu", handler);
  return () => document.removeEventListener("contextmenu", handler);
}

/**
 * Prevents Ctrl+U (view source), Ctrl+Shift+I (DevTools),
 * Ctrl+Shift+J (console), F12.
 */
export function disableInspectShortcuts(): () => void {
  const handler = (e: KeyboardEvent) => {
    const ctrl  = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;

    if (
      e.key === "F12" ||
      (ctrl && shift && ["i", "I", "j", "J", "c", "C"].includes(e.key)) ||
      (ctrl && ["u", "U"].includes(e.key))
    ) {
      e.preventDefault();
      e.stopPropagation();
    }
  };
  document.addEventListener("keydown", handler, true);
  return () => document.removeEventListener("keydown", handler, true);
}

/**
 * Prevents selecting all text with Ctrl+A on non-input elements.
 * Also prevents Ctrl+S (save page) and Ctrl+P (print/clone).
 */
export function disableContentExfiltrationShortcuts(): () => void {
  const handler = (e: KeyboardEvent) => {
    const ctrl = e.ctrlKey || e.metaKey;
    const tag  = (e.target as HTMLElement)?.tagName?.toLowerCase();
    const editable = ["input", "textarea"].includes(tag) || (e.target as HTMLElement)?.isContentEditable;

    if (ctrl && ["s", "S", "p", "P"].includes(e.key)) {
      e.preventDefault();
    }
    if (ctrl && ["a", "A"].includes(e.key) && !editable) {
      e.preventDefault();
    }
  };
  document.addEventListener("keydown", handler, true);
  return () => document.removeEventListener("keydown", handler, true);
}

/**
 * Master init — call once at app boot.
 * Returns a cleanup function for React strict-mode unmount.
 */
export function initAppProtection(): () => void {
  initConsoleWarning();

  const cleanupDevTools  = initDevToolsGuard();
  const cleanupContext   = disableContextMenu();
  const cleanupInspect   = disableInspectShortcuts();
  const cleanupExfil     = disableContentExfiltrationShortcuts();

  return () => {
    cleanupDevTools();
    cleanupContext();
    cleanupInspect();
    cleanupExfil();
  };
}
