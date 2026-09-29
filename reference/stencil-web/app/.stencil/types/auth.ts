/** The signed-in app user, as auth hands it to loaders and to `<AuthProvider>`. */
export type AuthUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
};
