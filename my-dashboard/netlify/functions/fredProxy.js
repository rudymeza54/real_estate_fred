// netlify/functions/fredProxy.js
const axios = require('axios');

exports.handler = async function(event, context) {
  try {
    // Get API key from environment variable
    const FRED_API_KEY = process.env.FRED_API_KEY;
    
    // Get series ID from path parameter
    const path = event.path.split('/');
    const seriesId = path[path.length - 1];
    
    // Build query parameters for FRED API
    const params = new URLSearchParams(event.queryStringParameters || {});
    params.append('api_key', FRED_API_KEY);
    params.append('file_type', 'json');
    
    // Make request to FRED API
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&${params}`;
    console.log(`Proxying request to: ${url}`);
    
    const response = await axios.get(url);
    
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify(response.data)
    };
  } catch (error) {
    console.error('Error proxying FRED request:', error);
    
    let statusCode = 500;
    let errorMessage = 'Internal Server Error';
    
    if (error.response) {
      statusCode = error.response.status;
      errorMessage = error.response.data?.error_message || error.message;
    }
    
    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({
        error: 'FRED API Error',
        message: errorMessage
      })
    };
  }
};