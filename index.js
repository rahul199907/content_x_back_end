// Import necessary modules
const express = require('express'); // For creating the web server
const { default: fetch } = require('node-fetch'); // For making HTTP requests (to Gemini API)
const cors = require('cors'); // For handling Cross-Origin Resource Sharing
require('dotenv').config(); // For loading environment variables from a .env file

// Initialize the Express application
const app = express();
const PORT = process.env.PORT || 3000; // Define the port for the server, default to 3000
const BASE_URL = process.env.BASE_URL || "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent"; // Base URL for Gemini API

// --- Middleware ---
// Enable CORS for all origins during development.
// In production, you should restrict this to your specific frontend origin(s).
app.use(cors());
app.use(express.json()); // Middleware to parse JSON request bodies

// --- API Key Configuration ---
// IMPORTANT: In a real-world application, you would secure your API key
// by not exposing it directly in client-side code and by using proper
// authentication/authorization mechanisms. For this example, we're
// loading it from an environment variable.
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ""; // Your Gemini API Key

// Ensure the API key is provided
if (!GEMINI_API_KEY) {
    console.warn("WARNING: GEMINI_API_KEY is not set in your .env file. " +
                 "The Gemini API calls might fail without it. " +
                 "For local development, create a .env file with GEMINI_API_KEY='YOUR_API_KEY'.");
}

// --- API Endpoint for LinkedIn Post Generation ---
app.post('/generate-linkedin-post', async (req, res, next) => {
    try {
        // Extract parameters from the request body
        const { topic, tone, length, keywords } = req.body;

        // Basic input validation
        if (!topic) {
            return res.status(400).json({ error: 'Topic is required to generate a LinkedIn post.' });
        }

        // Determine the tone, defaulting to 'professional' if not provided
        const effectiveTone = tone || 'professional';

        // Construct the prompt for the Gemini LLM
        // Modified prompt to request 3 distinct options and guide on formatting.
        let prompt = `Generate 3 distinct LinkedIn text post options about "${topic}".`;
        prompt += ` Each option should be in a ${effectiveTone} tone.`;
        
        if (length) {
            prompt += ` Keep each post length ${length}.`; // e.g., "short", "medium", "detailed"
        }
        if (keywords && keywords.length > 0) {
            prompt += ` Incorporate these keywords naturally into each post: ${keywords.join(', ')}.`;
        }

        // Instructions for LinkedIn best practices and neuro-copywriting
        prompt += ` Ensure each post is highly engaging for a professional audience, uses appropriate line breaks for readability, and focuses on providing value or insights.`;
        prompt += ` Use neuro-copywriting storytelling techniques (e.g., starting with a question, a relatable scenario, or a bold statement) within each post.`;
        prompt += ` Each post should be suitable for a professional network in India.`;
        prompt += ` Present each option clearly, starting with "Option 1:", "Option 2:", "Option 3:". Do NOT include any Markdown bold (**) or italic (*) formatting.`;
        prompt += ` For example:
        Option 1: Imagine reclaiming hours each week by automating repetitive marketing tasks. AI isn't just a buzzword; it's a powerful tool for boosting marketing efficiency. From content generation to campaign optimization, AI is transforming how we work. How are you leveraging AI to streamline your marketing efforts? #AI #MarketingAutomation #DigitalMarketing #ArtificialIntelligence #MarketingAI
        Option 2: Remember the days of generic marketing blasts? Thankfully, those are fading. AI empowers marketers to create hyper-personalized experiences at scale, leading to higher engagement and conversions. What innovative AI-driven personalization strategies are you exploring? #AIinMarketing #PersonalizedMarketing #CustomerExperience #MarketingTechnology #AI
        Option 3: Drowning in data, struggling to find actionable insights? AI algorithms can analyze vast datasets to uncover hidden trends and predict customer behavior with greater accuracy. How are you using AI to make data-driven marketing decisions? #AIMarketing #DataDrivenMarketing #MarketingAnalytics #ArtificialIntelligence #BigData`;



        // Prepare the payload for the Gemini API request
        const payload = {
            contents: [{
                role: "user",
                parts: [{ text: prompt }]
            }],
            generationConfig: {
                // You can add more generation configurations here, e.g., temperature, topK, topP
            }
        };

        // Define the Gemini API URL
        const apiUrl = `${BASE_URL}?key=${GEMINI_API_KEY}`;

        // Make the API call to Gemini
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        // Check if the response was successful
        if (!response.ok) {
            const errorData = await response.json();
            console.error('Gemini API Error:', errorData);
            const error = new Error('Failed to generate content from Gemini API');
            error.statusCode = response.status;
            error.details = errorData;
            return next(error);
        }

        // Parse the JSON response from Gemini
        const result = await response.json();

        // Extract the generated text
        let generatedText = "Could not generate content. Please try again.";
        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {
            generatedText = result.candidates[0].content.parts[0].text;
            // Post-processing: Remove Markdown bold (**) and italic (*) symbols
            generatedText = generatedText.replace(/\*\*(.*?)\*\*/g, '$1'); // Remove ** and keep content
            generatedText = generatedText.replace(/\*(.*?)\*/g, '$1');   // Remove * and keep content
        } else {
            console.warn('Unexpected Gemini API response structure:', result);
        }

        // Send the generated text back to the client
        res.json({
            success: true,
            postContent: generatedText // This will now contain all 3 options as a single string
        });

    } catch (error) {
        console.error('Server error during LinkedIn post generation:', error);
        next(error);
    }
});

// --- API Endpoint for Hashtag Generation ---
app.post('/generate-hashtags', async (req, res, next) => {
    try {
        const { textContent, numHashtags, includeTrending } = req.body;

        if (!textContent) {
            return res.status(400).json({ error: 'Text content is required to generate hashtags.' });
        }

        let prompt = `Generate ${numHashtags || 5} highly relevant and professional hashtags for the following LinkedIn post text:\n\n"${textContent}"\n\n`;
        prompt += `Ensure a mix of broad and niche hashtags. Do not include any other text, just the hashtags, separated by spaces.`;
        if (includeTrending) {
            prompt += ` Also, try to include 1-2 currently trending professional hashtags if relevant.`;
        }

        const payload = {
            contents: [{
                role: "user",
                parts: [{ text: prompt }]
            }],
            generationConfig: {}
        };

        const apiUrl = `${BASE_URL}?key=${GEMINI_API_KEY}`;
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Gemini API Error (Hashtags):', errorData);
            const error = new Error('Failed to generate hashtags from Gemini API');
            error.statusCode = response.status;
            error.details = errorData;
            return next(error);
        }

        const result = await response.json();
        let generatedHashtags = "";
        if (result.candidates && result.candidates.length > 0 &&
            result.candidates[0].content && result.candidates[0].content.parts &&
            result.candidates[0].content.parts.length > 0) {
            generatedHashtags = result.candidates[0].content.parts[0].text.trim();
            generatedHashtags = generatedHashtags.replace(/^(Here are your hashtags:|Hashtags:)\s*/i, '');
        }

        const hashtagsArray = generatedHashtags.split(/\s+/).filter(tag => tag.length > 0).map(tag => {
            return tag.startsWith('#') ? tag : `#${tag}`;
        });

        res.json({
            success: true,
            hashtags: hashtagsArray
        });

    } catch (error) {
        console.error('Server error during hashtag generation:', error);
        next(error);
    }
});

// --- default route for testing ---
app.get('/', (req, res) => {
    res.send('Welcome to the LinkedIn Post and Hashtag Generation API! Use the endpoints to generate content.');
});

// --- Global Error Handling Middleware ---
app.use((err, req, res, next) => {
    console.error('Global Error Handler:', err.stack);
    res.status(err.statusCode || 500).json({
        error: err.message || 'An unexpected error occurred.',
        details: err.details || null
    });
});

// --- Handle unhandled promise rejections (important for async operations) ---
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// --- Start the server ---
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    console.log(`LinkedIn Post Generation API: POST http://localhost:${PORT}/generate-linkedin-post`);
    console.log(`Hashtag Generation API: POST http://localhost:${PORT}/generate-hashtags`);
});
