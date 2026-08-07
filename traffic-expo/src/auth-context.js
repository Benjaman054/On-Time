// A tiny context so any screen (e.g. Settings) can sign the user out without
// prop-drilling. App.js supplies the actual signOut function.
import React, { createContext, useContext } from 'react';

const AuthContext = createContext({ signOut: async () => {} });

export function AuthProvider({ signOut, children }) {
  return <AuthContext.Provider value={{ signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
