// PM2 process definition for Koku. Run:
//   pm2 start ecosystem.config.js
//   pm2 save && pm2 startup
module.exports = {
  apps: [
    {
      name: "koku",
      script: "node_modules/next/dist/bin/next",
      args: "start -p 3001",
      cwd: __dirname,
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "512M",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
