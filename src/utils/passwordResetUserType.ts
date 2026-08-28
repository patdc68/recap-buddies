export type PasswordResetUserType = 'admin';

export const getPasswordResetUserType = (type: string | null): PasswordResetUserType => {
  void type;
  return 'admin';
};

export const getPasswordResetRedirectUrl = (userType: PasswordResetUserType): string => (
  `https://recap-buddies.com/reset-password?type=${userType}`
);

export const getPasswordResetLoginPath = (userType: PasswordResetUserType): string => {
  void userType;
  return '/admin/login';
};
