const TOKEN_KEY = 'cmanage_token';
const USER_KEY = 'cmanage_user';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
}

export const auth = {
  getToken: (): string | null => localStorage.getItem(TOKEN_KEY),
  getUser: (): AuthUser | null => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  },
  save(token: string, user: AuthUser): void {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clear(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
  isLoggedIn: (): boolean => Boolean(localStorage.getItem(TOKEN_KEY)),
};
