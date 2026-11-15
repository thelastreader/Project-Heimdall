/** Exposes the authenticated session context to React components. */

import { useContext } from 'react';
import { AuthContext } from './context';

export function useAuth() {
  
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used within AuthProvider');
  return value;
}
