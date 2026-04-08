import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

/**
 * Adaptive Storage Adapter
 * 
 * Controls session persistence based on the "Remember Me" checkbox:
 * - Checked:   tokens go to localStorage   → survive browser close
 * - Unchecked: tokens go to sessionStorage  → cleared on browser close
 * 
 * The preference itself is always stored in localStorage so we can
 * read it on cold start before any Supabase call.
 */
const REMEMBER_KEY = '1clinic_remember_session'

function getBackingStore(): Storage {
    const remember = localStorage.getItem(REMEMBER_KEY)
    return remember === 'true' ? localStorage : sessionStorage
}

const adaptiveStorage = {
    getItem: (key: string): string | null => {
        // Check both stores — handles the case where the user previously had
        // "remember me" on and now turns it off (tokens are still in localStorage)
        return getBackingStore().getItem(key) ?? localStorage.getItem(key) ?? sessionStorage.getItem(key)
    },
    setItem: (key: string, value: string): void => {
        getBackingStore().setItem(key, value)
        // Clean the other store to avoid stale tokens
        const other = getBackingStore() === localStorage ? sessionStorage : localStorage
        other.removeItem(key)
    },
    removeItem: (key: string): void => {
        localStorage.removeItem(key)
        sessionStorage.removeItem(key)
    },
}

/** Call this BEFORE signInWithPassword to set the persistence mode */
export function setRememberSession(remember: boolean): void {
    localStorage.setItem(REMEMBER_KEY, String(remember))
    
    if (!remember) {
        // Move any existing auth tokens from localStorage to sessionStorage
        // so they'll be cleared when the browser closes
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i)
            if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
                const value = localStorage.getItem(key)
                if (value) {
                    sessionStorage.setItem(key, value)
                    localStorage.removeItem(key)
                }
            }
        }
    }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        storage: adaptiveStorage,
        persistSession: true,
        autoRefreshToken: true,
    }
})
