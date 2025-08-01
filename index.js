const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const axios = require('axios');
const app = express();
const port = 3002;

// Initialize SQLite database
const db = new sqlite3.Database(':memory:'); // In-memory for simplicity; use a file for persistence

// Create orders table
db.serialize(() => {
  db.run(`CREATE TABLE orders (id INTEGER PRIMARY KEY AUTOINCREMENT, userId INTEGER, product TEXT, amount REAL)`);
});

// Middleware to parse JSON
app.use(express.json());

// Create an order
app.post('/orders', async (req, res) => {
  const { userId, product, amount } = req.body;
  if (!userId || !product || !amount) {
    return res.status(400).json({ error: 'userId, product, and amount are required' });
  }

  // Check if user exists by calling User Service
  try {
    await axios.get(`http://localhost:3001/users/${userId}`);
  } catch (error) {
    if (error.response && error.response.status === 404) {
      return res.status(400).json({ error: 'User not found' });
    }
    return res.status(500).json({ error: 'Failed to validate user' });
  }

  // Insert order
  const stmt = db.prepare('INSERT INTO orders (userId, product, amount) VALUES (?, ?, ?)');
  stmt.run(userId, product, amount, function (err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to create order' });
    }
    res.status(201).json({ id: this.lastID, userId, product, amount });
  });
  stmt.finalize();
});

// Get an order by ID
app.get('/orders/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM orders WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to retrieve order' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(row);
  });
});

// Start the server
app.listen(port, () => {
  console.log(`Order Service running on http://localhost:${port}`);
});