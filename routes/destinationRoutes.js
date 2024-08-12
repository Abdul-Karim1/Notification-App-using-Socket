const express = require('express');
const router = express.Router();
const Destination = require('../models/Destination');
const ConfigureDest = require('../models/ConfigureDest');
const redisClient = require('../services/redisService');

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
    logToClient('Error:', err);
    res.status(500).send('Error retrieving destinations');
  }
});

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
    const confDestinations = await ConfigureDest.find();

    await redisClient.setEx(cacheKey, 60, JSON.stringify(confDestinations));
    console.log('Cache updated for configured destinations');
    res.json(confDestinations);
  } catch (err) {
    logToClient('Error:', err);
    res.status(500).send('Error retrieving configured destinations');
  }
});

module.exports = router;
