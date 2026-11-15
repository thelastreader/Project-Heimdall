/** Defines the React context contract for the authenticated TB screening session. */

import { createContext } from 'react';
import type { AuthUser } from '../services/api';

export type Credentials = { email: string; password: string; remember_me: boolean };
export type Registration = Credentials & { first_name: string; last_name: string; username: string };
export type AuthValue = {
  user: AuthUser | null;
  ready: boolean;
  login: (credentials: Credentials) => Promise<AuthUser>;
  register: (data: Registration) => Promise<AuthUser>;
  logout: () => Promise<void>;
};


export const AuthContext = createContext<AuthValue | null>(null);
