// services/socketService.js
const socketIo = require('socket.io');
const User = require('../models/User');
const ObjectId = require('mongoose').Types.ObjectId;
const UnreadNotification = require('../models/UnreadNotification');
const Notification = require('../models/Notification');
let ioInstance;

const setupSocket = (server) => {
  ioInstance = socketIo(server);
  const roomMap = new Map();

  ioInstance.on('connection', function(socket) {
    console.log('A user connected');

    socket.on('join', (userId) => {
      if (!userId) {
        socket.emit('error', 'User ID not provided');
        return;
      }

      try {
        const id = new ObjectId(userId);
        console.log("User id after object conversion:", id);
      } catch (error) {
        socket.emit('error', 'Invalid user ID.');
        return;
      }

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
    });

    socket.on('notificationRead', async ({ userId }) => {
      try {
        const unreadNotification = await UnreadNotification.findById(notificationId);

        if (!unreadNotification) {
          return;
        }

        if (unreadNotification.users.includes(userId)) {
          unreadNotification.users.pull(userId);
          await unreadNotification.save();
        }

        const notification = await Notification.findById(notificationId);
        if (notification) {
          notification.users = notification.users || [];
          if (!notification.users.includes(userId)) {
            notification.users.push(userId);
            await notification.save();
          }
        }
      } catch (error) {
        console.error('Error handling notificationRead event:', error);
      }
    });

    socket.on('disconnect', function() {
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
}

const getIo = () => ioInstance;

module.exports = { setupSocket, getIo };
