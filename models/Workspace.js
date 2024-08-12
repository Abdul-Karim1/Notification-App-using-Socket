// models/Workspace.js
const mongoose = require('mongoose');

// Define the schema for the Workspace collection
const workspaceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Users' }]
});

// Create and export the Workspace model
const Workspace = mongoose.model('Workspace', workspaceSchema);
module.exports = Workspace;
