// models/User.js
const mongoose = require('mongoose');

// Define the schema for the User collection
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  workspaces: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Workspace' }]
});

// Create and export the User model
const User = mongoose.model('Users', userSchema);
module.exports = User;
