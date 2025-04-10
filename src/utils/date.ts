import { format, parseISO } from 'date-fns';

export function formatDate(date: string | Date, formatStr = 'MMMM d, yyyy'): string {
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : date;
    return format(dateObj, formatStr);
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
}

export function isValidDate(date: string | Date): boolean {
  try {
    if (typeof date === 'string') {
      return !isNaN(Date.parse(date));
    }
    return date instanceof Date && !isNaN(date.getTime());
  } catch {
    return false;
  }
}

export function getRelativeTime(date: string | Date): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    const now = new Date();
    const diff = dateObj.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days > 0) {
      return `${days} day${days === 1 ? '' : 's'} away`;
    } else if (days === 0) {
      return 'Today';
    } else {
      return `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago`;
    }
  } catch (error) {
    console.error('Error getting relative time:', error);
    return '';
  }
}

export function getDayName(date: string | Date): string {
  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return format(dateObj, 'EEEE');
  } catch (error) {
    console.error('Error getting day name:', error);
    return '';
  }
}

export function getTimeSlots(startTime: string, endTime: string, intervalMinutes: number = 30): string[] {
  try {
    const slots: string[] = [];
    const start = new Date(`1970-01-01T${startTime}`);
    const end = new Date(`1970-01-01T${endTime}`);

    let current = start;
    while (current <= end) {
      slots.push(format(current, 'h:mm a'));
      current = new Date(current.getTime() + intervalMinutes * 60000);
    }

    return slots;
  } catch (error) {
    console.error('Error generating time slots:', error);
    return [];
  }
}

export function getDateRange(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];
  let currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    dates.push(new Date(currentDate));
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return dates;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function subtractDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
}
