// models/Notification.js
const mongoose = require('mongoose');

// Define the schema for the Destination collection
const UnreadNotificationSchema = new mongoose.Schema({
  message: { type: String, required: true },
  workspace_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace' },
  users: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Users' }]
});

// Create and export the Destination model
const UnreadNotification = mongoose.model('UnreadNotification', UnreadNotificationSchema);
module.exports = UnreadNotification;
