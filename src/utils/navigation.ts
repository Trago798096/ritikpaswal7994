/**
 * Navigation utility functions for the application
 * Provides consistent URL generation for navigation
 */

/**
 * Generate URL for the booking confirmation page
 * @param bookingId The ID of the booking
 * @param status Status of the booking (success, error, pending)
 * @param message Optional message to display
 * @returns URL string for the confirmation page
 */
export const getConfirmationUrl = (bookingId: string, status: 'success' | 'error' | 'pending' = 'success', message?: string): string => {
  try {
    return `/booking/confirmation/${bookingId}?status=${status}${message ? `&message=${encodeURIComponent(message)}` : ''}`;
  } catch (error) {
    console.error('Error generating confirmation URL:', error);
    return `/booking/confirmation/${bookingId}`;
  }
};

/**
 * Generate URL for the payment page
 * @param bookingId The ID of the booking
 * @returns URL string for the payment page
 */
export const getPaymentUrl = (bookingId: string): string => {
  return `/booking/payment/${bookingId}`;
};
