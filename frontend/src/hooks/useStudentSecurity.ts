import { useEffect } from 'react';

/**
 * Disables right-click context menu for student portal.
 * Shortcut keys are unrestricted.
 */
export const useStudentSecurity = (enabled: boolean = true) => {
  useEffect(() => {
    if (!enabled) return;

    // Prevent Right-Click context menu for students
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    window.addEventListener('contextmenu', handleContextMenu, { capture: true });

    return () => {
      window.removeEventListener('contextmenu', handleContextMenu, { capture: true });
    };
  }, [enabled]);
};

export default useStudentSecurity;
