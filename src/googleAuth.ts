export const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim() ?? ''

const SCOPE = 'openid email https://www.googleapis.com/auth/spreadsheets'
const STORAGE_KEY = 'tabellen.google-session'

type GoogleSession = {
  accessToken: string
  expiresAt: number
  email: string
}

type TokenResponse = {
  access_token?: string
  expires_in?: number
}

type TokenClient = {
  requestAccessToken: (override?: { prompt?: string }) => void
}

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string
            scope: string
            callback: (response: TokenResponse) => void
            error_callback?: () => void
          }) => TokenClient
          revoke: (token: string, done: () => void) => void
        }
      }
    }
  }
}

function waitForGoogle() {
  if (window.google?.accounts.oauth2) return Promise.resolve()
  return new Promise<void>((resolve, reject) => {
    const started = Date.now()
    const timer = window.setInterval(() => {
      if (window.google?.accounts.oauth2) {
        window.clearInterval(timer)
        resolve()
      } else if (Date.now() - started > 8000) {
        window.clearInterval(timer)
        reject(new Error('Die Google-Anmeldung konnte nicht geladen werden.'))
      }
    }, 50)
  })
}

export function readGoogleSession(): GoogleSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as GoogleSession
    if (!parsed.accessToken || parsed.expiresAt < Date.now() + 30_000) {
      sessionStorage.removeItem(STORAGE_KEY)
      return null
    }
    return parsed
  } catch {
    return null
  }
}

async function googleEmail(accessToken: string) {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!response.ok) return 'Google-Konto'
  const profile = (await response.json()) as { email?: string }
  return profile.email || 'Google-Konto'
}

export function signInWithGoogle() {
  if (!googleClientId) {
    return Promise.reject(new Error('Die Google-Anmeldung ist noch nicht eingerichtet.'))
  }
  return waitForGoogle().then(
    () =>
      new Promise<GoogleSession>((resolve, reject) => {
        const client = window.google?.accounts.oauth2.initTokenClient({
          client_id: googleClientId,
          scope: SCOPE,
          callback: (response) => {
            if (!response.access_token) {
              reject(new Error('Die Google-Anmeldung wurde abgebrochen.'))
              return
            }
            void googleEmail(response.access_token).then((email) => {
              const session = {
                accessToken: response.access_token as string,
                expiresAt: Date.now() + (response.expires_in ?? 3600) * 1000,
                email,
              }
              sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
              resolve(session)
            })
          },
          error_callback: () => reject(new Error('Die Google-Anmeldung wurde abgebrochen.')),
        })
        if (!client) {
          reject(new Error('Die Google-Anmeldung konnte nicht geladen werden.'))
          return
        }
        client.requestAccessToken({ prompt: 'consent' })
      }),
  )
}

export function signOutFromGoogle() {
  const session = readGoogleSession()
  sessionStorage.removeItem(STORAGE_KEY)
  if (session && window.google) {
    window.google.accounts.oauth2.revoke(session.accessToken, () => undefined)
  }
}
