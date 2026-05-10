import { select, input, confirm, password } from '@inquirer/prompts';
import { ApiClient } from '../../core/api.js';

let client: ApiClient | null = null;

export function getOrCreateClient(apiKey: string, baseUrl: string, adminKey?: string): ApiClient {
  client = new ApiClient({ apiKey, baseUrl, adminKey });
  return client;
}

export function getTuiClient(): ApiClient {
  if (!client) throw new Error('Not connected. Run auth setup first.');
  return client;
}

export type MenuChoice = { name: string; value: string; description?: string };

export async function menuSelect(message: string, choices: MenuChoice[]): Promise<string> {
  return select({ message, choices });
}

export async function menuInput(message: string, def?: string): Promise<string> {
  return input({ message, default: def });
}

export async function menuConfirm(message: string, def = false): Promise<boolean> {
  return confirm({ message, default: def });
}

export async function menuPassword(message: string): Promise<string> {
  return password({ message });
}

import { smartFormat } from '../smart-fmt.js';

export function printJson(data: any) {
  smartFormat(data);
}

export async function pause() {
  await input({ message: '\nPress Enter to continue...' });
}

export const BACK = '__back__';
export const EXIT = '__exit__';

// Cognito direct auth for token exchange
const COGNITO_CLIENT_ID = '40lb1hrt119idkb2abg0q0pj6g';
const COGNITO_REGION = 'us-east-1';

export async function cognitoAuth(email: string, pwd: string): Promise<{ idToken: string; accessToken: string } | null> {
  const url = `https://cognito-idp.${COGNITO_REGION}.amazonaws.com/`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-amz-json-1.1', 'X-Amz-Target': 'AWSCognitoIdentityProviderService.InitiateAuth' },
      body: JSON.stringify({ AuthFlow: 'USER_PASSWORD_AUTH', ClientId: COGNITO_CLIENT_ID, AuthParameters: { USERNAME: email, PASSWORD: pwd } }),
    });
    const data = await res.json();
    if (data.AuthenticationResult) {
      return { idToken: data.AuthenticationResult.IdToken, accessToken: data.AuthenticationResult.AccessToken };
    }
    console.error('Cognito auth failed:', data.message || data.__type || 'Unknown error');
    return null;
  } catch (e: any) { console.error('Cognito error:', e.message); return null; }
}

export async function epsimoExchange(cognitoIdToken: string): Promise<string | null> {
  try {
    const res = await fetch('https://backend.epsimoai.io/auth/exchange', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${cognitoIdToken}` },
    });
    const data = await res.json();
    return data.token || null;
  } catch (e: any) { console.error('EpsimoAI exchange error:', e.message); return null; }
}

export function backChoice(): MenuChoice {
  return { name: '← Back', value: BACK };
}

export function exitChoice(): MenuChoice {
  return { name: '✕ Exit', value: EXIT };
}
