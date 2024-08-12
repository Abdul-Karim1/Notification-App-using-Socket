const socketIo = require('socket.io');
const User = require('../models/User');
const ObjectId = require('mongoose').Types.ObjectId;
const UnreadNotification = require('../models/UnreadNotification');
const Notification = require('../models/Notification');
let ioInstance;

const setupSocket = (server) => {
  ioInstance = socketIo(server);
  const roomMap = new Map();

  ioInstance.on('connection', (socket) => {
    // Retrieve userID from the query parameters
    const userID = socket.handshake.query.userID;

    console.log('User connected with ID:', userID);
    socket.emit('log', `Connected with ID: ${userID}`);

    // Handle room joining logic
    if (userID) {
      socket.join(userID);
      socket.emit('connectedRoom', `Welcome user ${userID}`);
      console.log('User joined room:', userID);

      // Fetch missed and latest notifications when user reconnects
      fetchNotifications(userID, socket);

      let id;

      try {
        id = new ObjectId(userID);  // Corrected variable name from userId to userID
        console.log("User id after object conversion:", id);
      } catch (error) {
        socket.emit('error', 'Invalid user ID.');
        return;
      }
//Room Connection
      User.findOne({ _id: id })
        .then(user => {
          if (user && user.workspaces.length > 0) {
            const workspaceId = user.workspaces[0].toString();
            socket.join(workspaceId);
            if (!roomMap.has(workspaceId)) {
              roomMap.set(workspaceId, []);
            }
            roomMap.get(workspaceId).push(socket.id);
            socket.emit('connectedRoom', `You are connected to workspace: ${workspaceId}`);
          } else {
            socket.emit('error', 'No workspaces found for the user.');
          }
        })
        .catch(err => {
          socket.emit('error', 'Error fetching user data.');
        });
    } else {
      socket.emit('error', 'User ID not provided');
      return;
    }
//On read event
    socket.on('notificationRead', async ({ userId }) => {
      try {
        const notifications = await UnreadNotification.find({ users: userId });
        for (const unreadNotification of notifications) {
          if (unreadNotification.users.includes(userId)) {
            unreadNotification.users.pull(userId);
            await unreadNotification.save();
          }

          const notification = await Notification.findById(unreadNotification._id);
          if (notification) {
            notification.users = notification.users || [];
            if (!notification.users.includes(userId)) {
              notification.users.push(userId);
              await notification.save();
            }
          }
        }
      } catch (error) {
        console.error('Error handling notificationRead event:', error);
      }
    });

    socket.on('disconnect', () => {
      handleDisconnection(socket, roomMap);
    });
  });
}
//Handle Disconnection of the user
const handleDisconnection = (socket, roomMap) => {
  for (let [workspaceId, sockets] of roomMap.entries()) {
    const updatedSockets = sockets.filter(id => id !== socket.id);
    if (updatedSockets.length === 0) {
      roomMap.delete(workspaceId);
    } else {
      roomMap.set(workspaceId, updatedSockets);
    }
  }
  console.log('User disconnected with ID:', socket.id);
}

const fetchNotifications = async (userId, socket) => {
  try {
    //Fetch missed notifications
    const unreadNotifications = await UnreadNotification.find({ users: userId });

    unreadNotifications.forEach(notification => {
      socket.emit('notification', notification); // Send missed notifications
    });

    //Fetch latest notifications
    const latestNotifications = await Notification.find({ users: userId }).sort({ createdAt: -1 }).limit(10); // Adjust the limit as needed

    latestNotifications.forEach(notification => {
      socket.emit('notification', notification); // Send latest notifications
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
  }
}

//Gracefully handle server termination
const shutdownServer = (server) => {
  server.close(() => {
    console.log('Server shutting down...');
    process.exit(0);
  });
};
//For server termination instance
process.on('SIGINT', () => shutdownServer(ioInstance));
process.on('SIGTERM', () => shutdownServer(ioInstance));

const getIo = () => ioInstance;

module.exports = { setupSocket, getIo };
