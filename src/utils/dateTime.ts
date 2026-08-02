/**
 * Date/Time utilities with Australian formatting
 */

/**
 * Get current ISO timestamp
 */
export function getCurrentISOTimestamp(): string {
  return new Date().toISOString();
}

/**
 * Format ISO date to Australian date format (DD/MM/YYYY)
 */
export function formatAustralianDate(isoString: string): string {
  const date = new Date(isoString);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Format ISO time to Australian time format (HH:MM AM/PM)
 */
export function formatAustralianTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString('en-AU', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Format ISO datetime to Australian format
 */
export function formatAustralianDateTime(isoString: string): string {
  return `${formatAustralianDate(isoString)} ${formatAustralianTime(isoString)}`;
}

/**
 * Parse Australian date string (DD/MM/YYYY) to ISO
 */
export function parseAustralianDateToISO(dateStr: string, timeStr?: string): string {
  const [day, month, year] = dateStr.split('/').map(Number);
  const date = new Date(year, month - 1, day);
  
  if (timeStr) {
    const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (timeMatch) {
      let hours = parseInt(timeMatch[1], 10);
      const minutes = parseInt(timeMatch[2], 10);
      const period = timeMatch[3]?.toUpperCase();
      
      if (period === 'PM' && hours < 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      
      date.setHours(hours, minutes, 0, 0);
    }
  }
  
  return date.toISOString();
}

/**
 * Get date for display in date picker
 */
export function getDateForPicker(isoString?: string): Date {
  return isoString ? new Date(isoString) : new Date();
}

/**
 * Calculate duration between two ISO timestamps
 */
export function calculateDuration(timeIn: string, timeOut?: string): string {
  if (!timeOut) return '';
  
  const start = new Date(timeIn);
  const end = new Date(timeOut);
  const diffMs = end.getTime() - start.getTime();
  
  if (diffMs < 0) return '';
  
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours === 0) {
    return `${minutes} min`;
  }
  
  return `${hours}h ${minutes}m`;
}

/**
 * Get relative time string (e.g., "2 hours ago")
 */
export function getRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  
  const minutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
  
  return formatAustralianDate(isoString);
}
