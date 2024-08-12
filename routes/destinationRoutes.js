const express = require('express');
const router = express.Router();
const Destination = require('../models/Destination');  // Ensure this path is correct
const redisClient = require('../services/redisService');  // Ensure this path is correct
const rateLimit = require('express-rate-limit');

// Create rate limiter instance
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // Limit each IP to 5 requests per windowMs
  message: "Too many requests, please try again later."
});

// Apply rate limiter to all requests
router.use(limiter);

// Route to get all destinations
router.get('/destinations', async (req, res) => {
  const cacheKey = 'allDestinations';
  console.log("-------- Checking cache for destinations --------");

  try {
    const cachedData = await redisClient.get(cacheKey);
    
    if (cachedData) {
      console.log('Serving from cache');
      return res.json(JSON.parse(cachedData));
    }

    console.log("Cache miss - querying MongoDB");
    const destinations = await Destination.find();

    await redisClient.setEx(cacheKey, 60, JSON.stringify(destinations));
    console.log('Cache updated for destinations');
    res.json(destinations);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).send('Error retrieving destinations');
  }
});

// Route to get configured destinations
router.get('/configured-destinations', async (req, res) => {
  const cacheKey = 'allConfiguredDestinations';
  console.log("-------- Checking cache for configured/used destinations --------");

  try {
    const cachedData = await redisClient.get(cacheKey);
    
    if (cachedData) {
      console.log('Serving from cache');
      return res.json(JSON.parse(cachedData));
    }

    console.log("Cache miss - querying MongoDB");
    const confDestinations = await Destination.find({ configured: "true" });

    await redisClient.setEx(cacheKey, 60, JSON.stringify(confDestinations));
    console.log('Cache updated for configured destinations');
    res.json(confDestinations);
  } catch (err) {
    console.error('Error:', err);
    res.status(500).send('Error retrieving configured destinations');
  }
});

module.exports = router;
