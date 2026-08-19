import { useEffect } from 'react';

/**
 * Disables content selection, copying, and right-click for student portals.
 * Text inputs and textareas remain fully editable for notes, answers, and searching.
 */
export const useStudentSecurity = (enabled: boolean = true) => {
  useEffect(() => {
    if (!enabled) {
      document.body.classList.remove('student-protected-content');
      return;
    }

    const isEditable = (target: EventTarget | null) => {
      if (!target || !(target instanceof HTMLElement)) return false;
      const tagName = target.tagName.toLowerCase();
      return (
        tagName === 'input' ||
        tagName === 'textarea' ||
        target.isContentEditable ||
        target.getAttribute('contenteditable') === 'true'
      );
    };

    // 1. Prevent Right-Click context menu
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // 2. Prevent Content Selection (except inside input / textarea)
    const handleSelectStart = (e: Event) => {
      if (!isEditable(e.target)) {
        e.preventDefault();
        return false;
      }
    };

    // 3. Prevent Copy & Cut events
    const handleCopyCut = (e: ClipboardEvent) => {
      if (!isEditable(e.target)) {
        e.preventDefault();
        if (e.clipboardData) {
          e.clipboardData.clearData();
        }
        return false;
      }
    };

    // 4. Block DevTools & Copy/Cut keyboard shortcuts outside input fields
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const isShift = e.shiftKey;
      const key = e.key ? e.key.toUpperCase() : '';

      // DevTools shortcuts
      if (
        key === 'F12' ||
        (isCtrlOrCmd && isShift && (key === 'I' || key === 'J' || key === 'C')) ||
        (isCtrlOrCmd && key === 'U')
      ) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Copy/Cut/Print outside editable fields
      if (isCtrlOrCmd && (key === 'C' || key === 'X' || key === 'P')) {
        if (!isEditable(e.target)) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      }
    };

    // 5. Apply user-select none class to body
    document.body.classList.add('student-protected-content');

    window.addEventListener('contextmenu', handleContextMenu, { capture: true });
    window.addEventListener('selectstart', handleSelectStart, { capture: true });
    window.addEventListener('copy', handleCopyCut, { capture: true });
    window.addEventListener('cut', handleCopyCut, { capture: true });
    window.addEventListener('keydown', handleKeyDown, { capture: true });

    return () => {
      document.body.classList.remove('student-protected-content');
      window.removeEventListener('contextmenu', handleContextMenu, { capture: true });
      window.removeEventListener('selectstart', handleSelectStart, { capture: true });
      window.removeEventListener('copy', handleCopyCut, { capture: true });
      window.removeEventListener('cut', handleCopyCut, { capture: true });
      window.removeEventListener('keydown', handleKeyDown, { capture: true });
    };
  }, [enabled]);
};

export default useStudentSecurity;
