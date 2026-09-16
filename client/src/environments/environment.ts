export const environment = {
  production: true,
  // Same-origin in production: Nginx serves the built Angular files and
  // reverse-proxies /api to the local Node process, so a relative path works
  // without needing to know the EC2 instance's public IP/domain at build time.
  apiUrl: '/api',
  // Empty string -> socket.io-client connects to the page's own origin,
  // where Nginx proxies /socket.io/ to the same Node process.
  socketUrl: '',
};
