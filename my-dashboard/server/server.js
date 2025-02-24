const express = require('express');
const axios = require('axios');
const cors = require('cors');
const dotenv = require('dotenv');
const app = express();

// Load environment variables
dotenv.config();

// Enable CORS for all routes
app.use(cors());

// Use the FRED API key from environment variables
const FRED_API_KEY = process.env.FRED_API_KEY || '59137ccec61ce6e3b25320357770eac7';

// Proxy endpoint for FRED API
app.get('/api/fred/:seriesId', async (req, res) => {
  try {
    const { seriesId } = req.params;
    const params = new URLSearchParams({
      api_key: FRED_API_KEY,
      file_type: 'json',
      ...req.query
    });
    
    const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&${params}`;
    console.log(`Proxying request to: ${url}`);
    
    const response = await axios.get(url);
    res.json(response.data);
  } catch (error) {
    console.error('Error proxying FRED request:', error.message);
    
    // Provide a more detailed error response
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error('FRED API error data:', error.response.data);
      console.error('FRED API error status:', error.response.status);
      res.status(error.response.status).json({
        error: 'FRED API Error',
        message: error.response.data.error_message || error.message,
        status: error.response.status
      });
    } else if (error.request) {
      // The request was made but no response was received
      console.error('No response received from FRED API');
      res.status(500).json({
        error: 'No Response',
        message: 'No response received from FRED API'
      });
    } else {
      // Something happened in setting up the request that triggered an Error
      res.status(500).json({
        error: 'Request Error',
        message: error.message
      });
    }
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start the server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
});