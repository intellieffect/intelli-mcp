/**
 * Date formatting utilities for file management
 */

/**
 * Format last modified date with relative time for recent files
 */
export const formatModifiedDate = (date: Date | string | undefined): string => {
  if (!date) return 'Unknown';
  
  const targetDate = new Date(date);
  if (isNaN(targetDate.getTime())) return 'Invalid date';
  
  const now = new Date();
  const diffMs = now.getTime() - targetDate.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  // Future dates (shouldn't happen but handle gracefully)
  if (diffMs < 0) return targetDate.toLocaleDateString();
  
  // Less than 1 minute
  if (diffMinutes < 1) return 'Just now';
  
  // Less than 1 hour
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  
  // Less than 24 hours
  if (diffHours < 24) return `${diffHours}h ago`;
  
  // Less than 7 days
  if (diffDays < 7) return `${diffDays}d ago`;
  
  // More than a week - show full date
  return targetDate.toLocaleDateString();
};

/**
 * Format date for detailed display (tooltips, info panels)
 */
export const formatDetailedDate = (date: Date | string | undefined): string => {
  if (!date) return 'Unknown';
  
  const targetDate = new Date(date);
  if (isNaN(targetDate.getTime())) return 'Invalid date';
  
  return targetDate.toLocaleString();
};

/**
 * Get relative time description for file status
 */
export const getFileStatusDescription = (lastModified: Date | string | undefined): string => {
  if (!lastModified) return 'Unknown status';
  
  const targetDate = new Date(lastModified);
  if (isNaN(targetDate.getTime())) return 'Invalid date';
  
  const now = new Date();
  const diffMs = now.getTime() - targetDate.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  
  if (diffHours < 1) return 'Recently modified';
  if (diffHours < 24) return 'Modified today';
  if (diffHours < 168) return 'Modified this week';
  return 'Modified earlier';
};

/**
 * Check if file was modified recently (within last hour)
 */
export const isRecentlyModified = (date: Date | string | undefined): boolean => {
  if (!date) return false;
  
  const targetDate = new Date(date);
  if (isNaN(targetDate.getTime())) return false;
  
  const now = new Date();
  const diffMs = now.getTime() - targetDate.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  
  return diffHours < 1;
};