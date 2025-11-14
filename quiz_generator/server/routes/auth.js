const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../database/config');
const { validateRequest, schemas } = require('../middleware/validation');

const router = express.Router();

/**
 * POST /api/auth/login
 * Mock authentication - accepts any username/password
 */
router.post('/login', validateRequest(schemas.login), async (req, res) => {
  try {
    const { username, password } = req.body;

    // Check if user exists
    let user = await db.query(
      'SELECT id, username FROM users WHERE username = $1',
      [username]
    );

    // If user doesn't exist, create them (mock authentication)
    if (user.rows.length === 0) {
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = await db.query(
        'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username',
        [username, hashedPassword]
      );
      user = newUser;
    }

    const userData = user.rows[0];

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: userData.id, 
        username: userData.username 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: userData.id,
        username: userData.username
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/register
 * Register new user (optional - login auto-creates users)
 */
router.post('/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;

    // Check if user already exists
    const existingUser = await db.query(
      'SELECT id FROM users WHERE username = $1',
      [username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email',
      [username, email, hashedPassword]
    );

    const user = result.rows[0];

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
