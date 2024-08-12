// models/Notification.js
const mongoose = require('mongoose');

// Define the schema for the Destination collection
const notificationSchema = new mongoose.Schema({
  message: { type: String, required: true },
  workspace_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace' }
});

// Create and export the Destination model
const Notification = mongoose.model('Notification', notificationSchema);
module.exports = Notification;
