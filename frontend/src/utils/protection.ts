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

export function initAppProtection(): () => void {
  initConsoleWarning();

  const cleanupDevTools = initDevToolsGuard();

  return () => {
    cleanupDevTools();
  };
}
