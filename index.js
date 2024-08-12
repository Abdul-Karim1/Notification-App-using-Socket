// index.js
const express = require('express');
const http = require('http');
const path = require('path');
const redisClient = require('./services/redisService');
const mongoose = require('./services/mongoService');
const { setupSocket, getIo } = require('./services/socketService'); // Import getIo correctly
const destinationRoutes = require('./routes/destinationRoutes');
const Destination = require('./models/Destination');
const Workspace = require('./models/Workspace');
const UnreadNotification = require('./models/UnreadNotification');

const app = express();
const server = http.createServer(app);

setupSocket(server); //Set up the socket server

app.use(express.json());

app.get('/', function(req, res) {
  var options = {
    root: path.join(__dirname),
  };
  var filename = 'index1.html';
  res.sendFile(filename, options);
});

app.use('/api', destinationRoutes);

const changeStream = Destination.watch([], {
  fullDocument: 'updateLookup',
  fullDocumentBeforeChange: 'whenAvailable',
});

changeStream.on('change', async (change) => {
  console.log('Change detected:', change);

  try {
    if (change.operationType === 'insert') {
      const newDestination = change.fullDocument;
      const workspaceId = newDestination.workspace_id.toString(); // Convert ObjectId to string
      console.log("----------INSERT----------");
      const workspace = await Workspace.findById(workspaceId).populate('users').exec();

      if (!workspace) {
        console.log('Workspace not found');
        return;
      }

      const userIds = workspace.users.map(user => user._id);
      const notificationMessage = `New Destination added: ${newDestination.name}`;
      const result = await UnreadNotification.create({
        message: notificationMessage,
        workspace_id: workspaceId,
        users: userIds,
      });
      const notificationId = result._id;
      console.log("----------------------->", notificationId);

      redisClient.del('allDestinations', (err) => {
        if (err) console.log('Redis cache deletion error:', err);
        else console.log('Cache invalidated for insert');
      });

      const io = getIo(); // Use the imported getIo function
      if (io) {
        io.to(workspaceId).emit('newDestination', newDestination);
        console.log(`Emitted new destination to workspace: ${workspaceId}`);
      } else {
        console.log(`No active connections for workspace: ${workspaceId}`);
      }
    } else if (change.operationType === 'update') {
      const updatedFields = change.updateDescription.updatedFields;
      const updatedDestinationId = change.documentKey._id.toString();
      const updatedDestination = await Destination.findById(updatedDestinationId);
      if (!updatedDestination) {
        console.log('Updated destination not found.');
        return;
      }

      const workspaceId = updatedDestination.workspace_id.toString();
      const workspace = await Workspace.findById(workspaceId).populate('users').exec();

      if (!workspace) {
        console.log('Workspace not found');
        return;
      }

      const userIds = workspace.users.map(user => user._id);
      const notificationMessage = `Destination Updated: ${updatedFields.name || updatedDestination.name}`;
      const result = await UnreadNotification.create({
        message: notificationMessage,
        workspace_id: workspaceId,
        users: userIds,
      });
      const notificationId = result._id;
      console.log("----------------------->", notificationId);

      redisClient.del('allDestinations', (err) => {
        if (err) console.log('Redis cache deletion error:', err);
        else console.log('Cache invalidated for update');
      });

      const io = getIo();
      if (io) {
        io.to(workspaceId).emit('updateDestination', {
          id: updatedDestinationId,
          updates: updatedFields,
        });
        console.log(`Emitted updated destination to workspace: ${workspaceId}`);
      } else {
        console.log(`No active connections for workspace or workspaceId not found: ${workspaceId}`);
      }
    } 
  } catch (error) {
    console.log('Error processing change:', error);
  }
});

server.listen(3000, function() {
  console.log('Server ready on port 3000');
});
