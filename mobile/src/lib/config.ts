const apiUrl = process.env.EXPO_PUBLIC_API_URL;

if (!apiUrl) {
  throw new Error('EXPO_PUBLIC_API_URL is not set. Copy mobile/.env.example to mobile/.env.');
}

export const config = {
  apiUrl: apiUrl.replace(/\/+$/, ''),
} as const;
