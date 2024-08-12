// services/logger.js
function logToClient(io, ...args) {
    const message = args.join(' ');
    console.log(message); // Keep original console log behavior
  
    if (io) io.emit('log', message);
  }
  
  module.exports = { logToClient };
  