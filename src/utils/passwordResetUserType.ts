export type PasswordResetUserType = 'admin' | 'renter';

export const getPasswordResetUserType = (type: string | null): PasswordResetUserType => (
  type === 'admin' ? 'admin' : 'renter'
);

export const getPasswordResetRedirectUrl = (userType: PasswordResetUserType): string => (
  `https://recap-buddies.com/reset-password?type=${userType}`
);

export const getPasswordResetLoginPath = (userType: PasswordResetUserType): string => (
  userType === 'admin' ? '/admin/login' : '/login'
);
