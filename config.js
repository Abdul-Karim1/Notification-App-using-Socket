require('dotenv').config(); // Load .env file

module.exports = {
  mongoUri: process.env.MONGO_URI,
  redisHost: process.env.REDIS_HOST,
  redisPort: process.env.REDIS_PORT
};
