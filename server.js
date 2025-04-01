require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Create Express app
const app = express();
const port = process.env.PORT || 3000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, '/')));

// Default route
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server
app.listen(port, () => {
    console.log(`Overlayz app listening at http://localhost:${port}`);
});