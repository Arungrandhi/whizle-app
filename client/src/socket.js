import io from 'socket.io-client';

// Single shared socket connection using direct websocket transport
// to prevent HTTP polling bottleneck and browser connection pooling limits.
const socket = io(process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5000`, {
  transports: ['websocket'],
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000
});

export default socket;
