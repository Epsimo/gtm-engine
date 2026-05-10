import { ApiClient } from '../core/api.js';

const COGNITO_DOMAIN = '59f4fa1df22e8335ebfb.auth.us-east-1.amazoncognito.com';
const CLIENT_ID = '40lb1hrt119idkb2abg0q0pj6g';
const SCOPES = 'phone email openid profile aws.cognito.signin.user.admin';
const TOKEN_URL = `https://${COGNITO_DOMAIN}/oauth2/token`;
const USERINFO_URL = `https://${COGNITO_DOMAIN}/oauth2/userInfo`;

const $ = (id: string) => document.getElementById(id)!;
const resultDiv = $('result') as HTMLDivElement;
const loggedOutDiv = $('loggedOut');
const loggedInDiv = $('loggedIn');
const userInfoDiv = $('userInfo');

function getRedirectUri(): string {
  return chrome.identity.getRedirectURL();
}

function showResult(msg: string) { resultDiv.textContent = msg; }

async function checkAuthState() {
  const { cognitoTokens } = await chrome.storage.local.get('cognitoTokens');
  if (cognitoTokens?.id_token) {
    loggedOutDiv.classList.add('hidden');
    loggedInDiv.classList.remove('hidden');
    const payload = JSON.parse(atob(cognitoTokens.id_token.split('.')[1]));
    userInfoDiv.innerHTML = `<strong>${payload.name || payload.email}</strong>${payload.email}`;
    showResult('Signed in.');
  } else {
    loggedOutDiv.classList.remove('hidden');
    loggedInDiv.classList.add('hidden');
    showResult('Ready.');
  }
}

// Google sign-in via Cognito hosted UI
$('googleSignIn').addEventListener('click', async () => {
  showResult('Opening Google sign-in...');
  const redirectUri = getRedirectUri();
  const authUrl = `https://${COGNITO_DOMAIN}/oauth2/authorize?` +
    `identity_provider=Google&response_type=code&client_id=${CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(SCOPES)}`;

  chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, async (callbackUrl) => {
    if (chrome.runtime.lastError || !callbackUrl) {
      showResult('Sign-in cancelled or failed: ' + (chrome.runtime.lastError?.message || 'No callback'));
      return;
    }
    const code = new URL(callbackUrl).searchParams.get('code');
    if (!code) { showResult('Error: No authorization code received.'); return; }
    await exchangeCodeForTokens(code, redirectUri);
  });
});

// Email/password sign-in via Cognito hosted UI (no identity_provider param = shows login form)
$('emailSignIn').addEventListener('click', () => {
  showResult('Opening sign-in page...');
  const redirectUri = getRedirectUri();
  const authUrl = `https://${COGNITO_DOMAIN}/login?response_type=code&client_id=${CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(SCOPES)}`;

  chrome.identity.launchWebAuthFlow({ url: authUrl, interactive: true }, async (callbackUrl) => {
    if (chrome.runtime.lastError || !callbackUrl) {
      showResult('Sign-in cancelled or failed: ' + (chrome.runtime.lastError?.message || 'No callback'));
      return;
    }
    const code = new URL(callbackUrl).searchParams.get('code');
    if (!code) { showResult('Error: No authorization code received.'); return; }
    await exchangeCodeForTokens(code, redirectUri);
  });
});

async function exchangeCodeForTokens(code: string, redirectUri: string) {
  showResult('Exchanging code for tokens...');
  try {
    const resp = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: CLIENT_ID,
        code,
        redirect_uri: redirectUri,
      }),
    });
    const tokens = await resp.json();
    if (tokens.error) { showResult('Token error: ' + tokens.error); return; }
    await chrome.storage.local.set({ cognitoTokens: tokens });
    await checkAuthState();
    showResult('Signed in successfully!');
  } catch (e: any) {
    showResult('Token exchange failed: ' + e.message);
  }
}

// Test API connection
$('authTest').addEventListener('click', async () => {
  showResult('Testing...');
  const { lgpApiKey, lgpBaseUrl } = await chrome.storage.local.get(['lgpApiKey', 'lgpBaseUrl']);
  if (!lgpApiKey) { showResult('No API Key. Go to Options to set it.'); return; }
  const client = new ApiClient({ apiKey: lgpApiKey, baseUrl: lgpBaseUrl || 'https://api.leadgenius.app' });
  try {
    const response = await client.get('/auth/test');
    showResult(JSON.stringify(response, null, 2));
  } catch (e: any) { showResult('Error: ' + e.message); }
});

// Open app
$('openApp').addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://last.leadgenius.app' });
});

// Sign out
$('signOut').addEventListener('click', async () => {
  await chrome.storage.local.remove('cognitoTokens');
  // Also clear Cognito session
  const redirectUri = getRedirectUri();
  const logoutUrl = `https://${COGNITO_DOMAIN}/logout?client_id=${CLIENT_ID}&logout_uri=${encodeURIComponent(redirectUri)}`;
  chrome.identity.launchWebAuthFlow({ url: logoutUrl, interactive: false }, () => {
    chrome.identity.clearAllCachedAuthTokens(() => {});
  });
  await checkAuthState();
  showResult('Signed out.');
});

checkAuthState();
