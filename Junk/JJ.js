// Import required modules
var express = require('express');
var mongoose = require('mongoose');
var http = require('http');
var path = require('path');
var redis = require('redis');  // Import Redis
var socketIo = require('socket.io');
const User = require('./User'); // Updated path to User model
const Destination = require('./Destination');
const { ObjectId } = mongoose.Types;
const Workspace = require('./Workspace')
const ConfigureDest = require('./ConfigureDest')
const Notification = require('./Notification')
const UnreadNotification = require('./UnreadNotification')
// Create an Express application
var app = express();

// Create an HTTP server
var server = http.createServer(app);

// Initialize Socket.IO with the HTTP server
var io = socketIo(server);

// Connect to Redis
const redisClient = redis.createClient({
  host: 'localhost', // Redis server address
  port: 6379 // Redis server port
});

// Connect to Redis
redisClient.connect().then(() => {
  console.log('Connected to Redis');
}).catch((err) => {
  console.log('Failed to connect to Redis:', err);
});

//mongodb+srv://abdulkarim:35fPeNRG9NtBpcWW@cluster0.czgyxvb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0/Destinations
// Connect to MongoDB 
mongoose.connect('mongodb+srv://abdulkarim:35fPeNRG9NtBpcWW@cluster0.czgyxvb.mongodb.net/Destinations')
  .then(() => {
    console.log('Connected to MongoDB');
  })
  .catch((err) => {
    console.log('MongoDB connection error:', err);
  });

// Serve the index.html file on the root route
app.get('/', function(req, res) {
  var options = {
    root: path.join(__dirname)
  }
  var filename = 'index1.html';
  res.sendFile(filename, options);
});

app.get('/destinations', async (req, res) => {
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

// Fetch all destinations with Redis caching
app.get('/destinations', async (req, res) => {
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

// Fetch all configured destinations with Redis caching
app.get('/configured-destinations', async (req, res) => {
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

 // Function to fetch all users
User.find()
  .then(users => {
    console.log("------------------------")
    console.log('All Users:', users);
  })
  .catch(err => {
    console.log('Error fetching users:', err);
  });

  

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
      logToClient("----------INSERT----------");
      const workspace = await Workspace.findById(workspaceId).populate('users').exec();

      if (!workspace) {
        logToClient('Workspace not found');
        return;
      }
      const userIds = workspace.users.map(user => user._id);
      // Create a new notification for the insertion
      const notificationMessage = `New Destination added: ${newDestination.name}`;
      result = await UnreadNotification.create({
        message: notificationMessage,
        workspace_id: workspaceId,
        users: userIds
      });
      const notificationId = result._id
      console.log("----------------------->",notificationId) 
      // Invalidate Redis cache on insert
      redisClient.del('allDestinations', (err) => {
        if (err) logToClient('Redis cache deletion error:', err);
        else console.log('Cache invalidated for insert');
      });

      // Emit to specific workspace room
      if (roomMap.has(workspaceId)) {
        io.to(workspaceId).emit('newDestination', newDestination);
        logToClient(`Emitted new destination to workspace: ${workspaceId}`);
      } else {
        logToClient(`No active connections for workspace: ${workspaceId}`);
      }

    } else if (change.operationType === 'update') {
      const updatedFields = change.updateDescription.updatedFields;
      const updatedDestinationId = change.documentKey._id.toString();

      // Fetch the updated document to get the workspaceId
      const updatedDestination = await Destination.findById(updatedDestinationId);
      if (!updatedDestination) {
        logToClient('Updated destination not found.');
        return;
      }

      const workspaceId = updatedDestination.workspace_id.toString(); // Convert ObjectId to string
      const workspace = await Workspace.findById(workspaceId).populate('users').exec();

      if (!workspace) {
        logToClient('Workspace not found');
        return;
      }
      const userIds = workspace.users.map(user => user._id);
      // Create a new notification for the updation
      
      const notificationMessage = `Destination Updated: ${updatedFields.name}`;
      result = await UnreadNotification.create({
        message: notificationMessage,
        workspace_id: workspaceId,
        users: userIds
      });
      const notificationId = result._id
      console.log("----------------------->",notificationId)
      // Invalidate Redis cache on update
      redisClient.del('allDestinations', (err) => {
        if (err) logToClient('Redis cache deletion error:', err);
        else logToClient('Cache invalidated for update');
      });

      if (roomMap.has(workspaceId)) {
        io.to(workspaceId).emit('updateDestination', {
          id: updatedDestinationId,
          updates: updatedFields,
        });
        logToClient(`Emitted updated destination to workspace: ${workspaceId}`);
      } else {
        logToClient(`No active connections for workspace or workspaceId not found: ${workspaceId}`);
      }

    } else if (change.operationType === 'delete') {
      const deletedDestinationId = change.documentKey._id.toString();
      const deletedDestination = change.fullDocumentBeforeChange; // Check pre-image

      if (!deletedDestination) {
        logToClient('Deleted destination not found.');
        return;
      }

      const workspaceId = deletedDestination.workspace_id.toString();

      const workspace = await Workspace.findById(workspaceId).populate('users').exec();

      if (!workspace) {
        logToClient('Workspace not found');
        return;
      }
      const userIds = workspace.users.map(user => user._id); 
      // Create a new notification for the deletion
      const notificationMessage = `Destination Deleted: ${deletedDestinationId}`;
      await UnreadNotification.create({
        message: notificationMessage,
        workspace_id: workspaceId,
        users: userIds
      });
      const notificationId = result._id
      console.log("----------------------->",notificationId)

      // Invalidate Redis cache on delete
      redisClient.del('allDestinations', (err) => {
        if (err) logToClient('Redis cache deletion error:', err);
        else logToClient('Cache invalidated for delete');
      });

      if (roomMap.has(workspaceId)) {
        io.to(workspaceId).emit('deleteDestination', {
          id: deletedDestinationId,
        });
        logToClient(`Emitted deleted destination to workspace: ${workspaceId}`);
      } else {
        logToClient(`No active connections for workspace: ${workspaceId}`);
      }
    }
  } catch (error) {
    logToClient('Error processing change:', error);
  }
});


// Define a variable to track rooms and their members
var roomMap = new Map();  // Stores workspaceId as key and array of socket ids as value

// Listen for new connections
io.on('connection', function(socket) {
  console.log('A user connected');

  // Expect user ID to be sent from the client on connection
  socket.on('join', (userId) => {
    if (!userId) {
      logToClient('User ID not provided');
      return;
    }

    // Convert userId to a valid ObjectId
    
    try {
      id = new ObjectId(userId);
      console.log("User id after object conversion:", id)
    } catch (error) {
      logToClient('Invalid user ID:', error);
      socket.emit('error', 'Invalid user ID.');
      return;
    }

    // Fetch the user from the database using the converted ObjectId
    User.findOne({ _id: id })
      .then(user => {
        if (user && user.workspaces.length > 0) {
          // Get the first workspace ID from the user's workspaces array
          const workspaceId = user.workspaces[0].toString(); // Convert ObjectId to string
          logToClient('Workspace Id:', workspaceId)
          // Join the workspace room
          socket.join(workspaceId);
          if (!roomMap.has(workspaceId)) {
            roomMap.set(workspaceId, []);
          }
          roomMap.get(workspaceId).push(socket.id);
          logToClient(`You are connected to workspace: ${workspaceId}`);
          // Emit connection confirmation
          socket.emit('connectedRoom', `You are connected to workspace: ${workspaceId}`);
        } else {
          socket.emit('error', 'No workspaces found for the user.');
          logToClient('No workspaces found for the user.');
        }
      })
      .catch(err => {
        logToClient('Error fetching user:', err);
        socket.emit('error', 'Error fetching user data.');
      });
  });
  socket.on('notificationRead', async ({userId }) => {
    try {
      // Find the unread notification
      const unreadNotification = await UnreadNotification.findById(notificationId);
  
      if (!unreadNotification) {
        logToClient('Unread notification not found');
        return;
      }
  
      // Update the UnreadNotification document
      if (unreadNotification.users.includes(userId)) {
        unreadNotification.users.pull(userId);
        await unreadNotification.save();
      }
  
      // Add the user to the Notification's user list
      const notification = await Notification.findById(notificationId);
      if (notification) {
        notification.users = notification.users || [];
        if (!notification.users.includes(userId)) {
          notification.users.push(userId);
          await notification.save();
        }
      }
  
      logToClient(`Notification read by user: ${userId}`);
  
    } catch (error) {
      logToClient('Error handling notificationRead event:', error);
    }
  });
  
  // Handle disconnection
  socket.on('disconnect', function() {
    console.log('A user disconnected');
    // Remove socket from roomMap
    for (let [workspaceId, sockets] of roomMap.entries()) {
      const updatedSockets = sockets.filter(id => id !== socket.id);
      if (updatedSockets.length === 0) {
        roomMap.delete(workspaceId);
      } else {
        roomMap.set(workspaceId, updatedSockets);
      }
    }
  });
});

// Start the server and listen on port 3000
server.listen(3000, function() {
  logToClient('Server ready on port 3000');
});

// Function to send log messages to the frontend
function logToClient(...args) {
  const message = args.join(' ');

  console.log(message); // Keep original console log behavior

  // Emit the log message to all connected clients
  io.emit('log', message);
}
