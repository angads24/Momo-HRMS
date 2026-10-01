/** Base URL of the API Gateway (see .env). */
export const API_URL: string = (process.env.EXPO_PUBLIC_API_URL ?? 'http://192.168.40.14:8000/api/v1').replace(/\/+$/, '');

export const COMPANY_NAME = 'Momo HRMS';
