import { createContext, useContext } from 'react'

/** { enabled, ready, user, signInWithEmail(email), signOut(), deleteAccount() } */
export const AuthContext = createContext({ enabled: false, client: null, ready: true, user: null })

export const useAuth = () => useContext(AuthContext)
