const mongoose = require('mongoose');

mongoose.connect('mongodb+srv://abdulkarim:35fPeNRG9NtBpcWW@cluster0.czgyxvb.mongodb.net/Destinations')
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((err) => {
    console.log('MongoDB connection error:', err);
  });

module.exports = mongoose;
