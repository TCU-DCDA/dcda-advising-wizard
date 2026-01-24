/**
 * Microsoft Azure AD Authentication Service
 *
 * Uses MSAL.js to authenticate users against TCU's Azure AD tenant.
 * This enables saving advising records to OneDrive within TCU's ecosystem.
 */

import { PublicClientApplication, type AccountInfo, type AuthenticationResult } from '@azure/msal-browser'

// MSAL configuration - uses environment variables for Azure app registration
const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID || '',
    authority: import.meta.env.VITE_AZURE_TENANT_ID
      ? `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID}`
      : 'https://login.microsoftonline.com/common',
    redirectUri: import.meta.env.VITE_AZURE_REDIRECT_URI || window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'sessionStorage' as const,
    storeAuthStateInCookie: false,
  },
}

// Scopes required for OneDrive file access
const loginScopes = {
  scopes: ['User.Read', 'Files.ReadWrite'],
}

// Singleton MSAL instance
let msalInstance: PublicClientApplication | null = null

/**
 * Check if Azure AD is configured
 */
export function isAzureConfigured(): boolean {
  return !!import.meta.env.VITE_AZURE_CLIENT_ID
}

/**
 * Initialize MSAL instance
 */
async function getMsalInstance(): Promise<PublicClientApplication> {
  if (!msalInstance) {
    if (!isAzureConfigured()) {
      throw new Error('Azure AD is not configured. Please set VITE_AZURE_CLIENT_ID in your .env file.')
    }
    msalInstance = new PublicClientApplication(msalConfig)
    await msalInstance.initialize()
  }
  return msalInstance
}

/**
 * Get the currently signed-in account (if any)
 */
export async function getCurrentAccount(): Promise<AccountInfo | null> {
  try {
    const msal = await getMsalInstance()
    const accounts = msal.getAllAccounts()
    return accounts.length > 0 ? accounts[0] : null
  } catch {
    return null
  }
}

/**
 * Sign in with Microsoft (TCU Azure AD)
 * Uses popup for better mobile compatibility
 */
export async function signIn(): Promise<AccountInfo | null> {
  const msal = await getMsalInstance()

  try {
    // Try popup first (better UX on mobile)
    const result: AuthenticationResult = await msal.loginPopup(loginScopes)
    return result.account
  } catch (popupError) {
    // If popup fails (blocked), fall back to redirect
    console.warn('Popup login failed, trying redirect:', popupError)
    await msal.loginRedirect(loginScopes)
    return null // Will redirect, so no return value
  }
}

/**
 * Sign out from Microsoft
 */
export async function signOut(): Promise<void> {
  const msal = await getMsalInstance()
  const account = await getCurrentAccount()

  if (account) {
    await msal.logoutPopup({
      account,
      postLogoutRedirectUri: window.location.origin,
    })
  }
}

/**
 * Get an access token for Microsoft Graph API
 * Silently acquires token if possible, otherwise prompts for login
 */
export async function getAccessToken(): Promise<string> {
  const msal = await getMsalInstance()
  const account = await getCurrentAccount()

  if (!account) {
    throw new Error('No account signed in. Please sign in first.')
  }

  try {
    // Try to get token silently
    const result = await msal.acquireTokenSilent({
      ...loginScopes,
      account,
    })
    return result.accessToken
  } catch {
    // If silent fails, try popup
    const result = await msal.acquireTokenPopup(loginScopes)
    return result.accessToken
  }
}

/**
 * Handle redirect response (call on app load)
 */
export async function handleRedirectResponse(): Promise<AccountInfo | null> {
  try {
    const msal = await getMsalInstance()
    const response = await msal.handleRedirectPromise()
    return response?.account || await getCurrentAccount()
  } catch {
    return null
  }
}
