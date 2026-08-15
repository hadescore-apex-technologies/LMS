export const getInitials = (name?: string | null, fallback: string = 'U'): string => {
  if (!name || typeof name !== 'string') return fallback;
  
  const cleanName = name.trim();
  if (!cleanName) return fallback;

  const parts = cleanName.split(/\s+/);
  
  if (parts.length >= 2) {
    // Return first letter of first name and first letter of last name
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  
  // If only one word, return up to first two letters
  return parts[0].substring(0, 2).toUpperCase();
};
