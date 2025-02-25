// src/config.ts
// This file centralizes API configuration

// For Netlify deployment, we'll use either the environment variable or default to the Netlify Functions path
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/.netlify/functions';

// If we're using Netlify Functions directly
const IS_NETLIFY_FUNCTIONS = API_BASE.includes('.netlify/functions');

// FRED API endpoint
export const FRED_API_URL = IS_NETLIFY_FUNCTIONS 
  ? `${API_BASE}/fredProxy` 
  : `${API_BASE}/api/fred`;

// Health check endpoint
export const HEALTH_CHECK_URL = IS_NETLIFY_FUNCTIONS 
  ? `${API_BASE}/health` 
  : `${API_BASE}/health`;