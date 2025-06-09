export const adminConfig = {
  admins: [
    {
      email: process.env.ADMIN_EMAIL_1 || "globallogisticsdsvs@gmail.com",
      password: process.env.ADMIN_PASSWORD_1 || "inGodsname12",
    },
    {
      email: process.env.ADMIN_EMAIL_2 || "machenry600@gmail.com",
      password: process.env.ADMIN_PASSWORD_2 || "Machenry2000$",
    },
  ],
  adminEmails: (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "globallogisticsdsvs@gmail.com,machenry600@gmail.com").split(","),
};

export const isAdminEmail = (email: string): boolean => {
  return adminConfig.adminEmails.includes(email);
}; 