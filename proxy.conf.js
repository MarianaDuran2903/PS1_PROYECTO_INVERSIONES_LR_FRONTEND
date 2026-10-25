// Proxy del dev-server: /api -> backend. En Docker se cambia con API_PROXY_TARGET.
module.exports = {
  '/api': {
    target: process.env.API_PROXY_TARGET || 'http://localhost:8080',
    secure: false,
    changeOrigin: true,
    logLevel: 'debug',
  },
};
