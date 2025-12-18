import fs from 'fs';
import path from 'path';
import jwt from 'jsonwebtoken';

const KEY_FILE_NAME = 'service-account.json';
const KEY_FILE_PATHS = [
    path.join(process.cwd(), '.secrets', KEY_FILE_NAME),
    path.join(process.cwd(), KEY_FILE_NAME) // Keep fallback
];

export async function getGoogleAccessToken(): Promise<string | null> {
    try {
        // 1. Try to find the file
        let filePath = KEY_FILE_PATHS.find(p => fs.existsSync(p));
        
        if (!filePath) {
            console.warn(`[GoogleAuth] ${KEY_FILE_NAME} not found in .secrets or root.`);
            return null;
        }


        // 2. Read and parse
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        const serviceAccount = JSON.parse(fileContent);

        // 3. Create JWT
        const scopes = ['https://www.googleapis.com/auth/cloud-platform'];
        const iat = Math.floor(Date.now() / 1000);
        const exp = iat + 3600; // 1 hour

        const payload = {
            iss: serviceAccount.client_email,
            sub: serviceAccount.client_email,
            aud: 'https://oauth2.googleapis.com/token',
            iat,
            exp,
            scope: scopes.join(' ')
        };

        const token = jwt.sign(payload, serviceAccount.private_key, { algorithm: 'RS256' });

        // 4. Exchange for Access Token
        const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                assertion: token
            })
        });

        if (!response.ok) {
            console.error('[GoogleAuth] Token exchange failed:', await response.text());
            return null;
        }

        const data = await response.json();
        return data.access_token;

    } catch (e: any) {
        console.error('[GoogleAuth] Error getting token:', e.message);
        return null; // Return null to allow fallback or error handling upstream
    }
}
