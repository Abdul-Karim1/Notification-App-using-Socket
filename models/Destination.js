// models/Destination.js
const mongoose = require('mongoose');

// Define the schema for the Destination collection
const destinationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  workspace_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace' }
});

// Create and export the Destination model
const Destination = mongoose.model('Destinations', destinationSchema);
module.exports = Destination;
