// models/Destination.js
const mongoose = require('mongoose');

// Define the schema for the Destination collection
const configureDestSchema = new mongoose.Schema({
  name: { type: String, required: true },
  workspace_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace' }
});

// Create and export the Destination model
const ConfigureDest = mongoose.model('ConfigureDest', configureDestSchema);
module.exports = ConfigureDest;
