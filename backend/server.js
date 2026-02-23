const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
const HF_API_KEY = process.env.HUGGINGFACE_API_KEY;

// ✅ FIXED: Using consistent model for financial sentiment analysis
const FINBERT_MODEL = 'https://router.huggingface.co/hf-inference/models/ProsusAI/finbert';

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Sentiment Analysis Backend is running',
    hasApiKey: !!HF_API_KEY,
    model: 'ProsusAI/finbert'
  });
});

// Single sentiment analysis endpoint
app.post('/api/sentiment', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (!HF_API_KEY) {
      return res.status(500).json({ error: 'Hugging Face API key not configured' });
    }

    console.log(`Analyzing sentiment for: ${text.substring(0, 50)}...`);

    // ✅ FIXED: Using correct model endpoint
    const response = await fetch(FINBERT_MODEL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: text,
        options: {
          wait_for_model: true,
          use_cache: true
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`FinBERT API error: ${response.status}`, errorText);
      return res.status(response.status).json({ 
        error: `FinBERT API error: ${response.status}`,
        details: errorText 
      });
    }

    const data = await response.json();
    
    // Check if model is loading
    if (data.error && data.error.includes('loading')) {
      console.log('Model is loading, will retry...');
      return res.status(503).json({ 
        error: 'Model is loading',
        estimated_time: data.estimated_time 
      });
    }

    console.log('✅ FinBERT analysis successful');
    res.json(data);

  } catch (error) {
    console.error('Error in sentiment analysis:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// Batch sentiment analysis endpoint
app.post('/api/sentiment/batch', async (req, res) => {
  try {
    const { texts } = req.body;

    if (!texts || !Array.isArray(texts)) {
      return res.status(400).json({ error: 'Texts array is required' });
    }

    if (!HF_API_KEY) {
      return res.status(500).json({ error: 'Hugging Face API key not configured' });
    }

    console.log(`Batch analyzing ${texts.length} texts...`);

    const results = [];
    
    // Process texts with small delays to avoid rate limits
    for (let i = 0; i < texts.length; i++) {
      console.log(`Processing ${i + 1}/${texts.length}...`);
      
      // ✅ FIXED: Using same model as single endpoint
      const response = await fetch(FINBERT_MODEL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HF_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: texts[i],
          options: {
            wait_for_model: true,
            use_cache: true
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        results.push({ success: true, data });
      } else {
        const errorText = await response.text();
        results.push({ success: false, error: errorText });
      }

      // Small delay between requests (500ms)
      if (i < texts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`✅ Batch analysis complete: ${results.filter(r => r.success).length}/${texts.length} successful`);
    res.json({ results });

  } catch (error) {
    console.error('Error in batch sentiment analysis:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// Root route
app.get('/', (req, res) => {
  res.send('🚀 Sentiment Analysis Backend is running successfully!');
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Sentiment Analysis Backend running on http://localhost:${PORT}`);
  console.log(`✅ Health check: http://localhost:${PORT}/api/health`);
  console.log(`🔑 API Key configured: ${!!HF_API_KEY}`);
  console.log(`📊 Using model: ProsusAI/finbert for financial sentiment analysis`);
});