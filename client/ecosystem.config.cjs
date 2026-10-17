module.exports = {
  apps: [
    {
      name: "arithmetic-client",
      script: "./node_modules/vite/bin/vite.js",
      cwd: __dirname,
      interpreter: "node",
      args: ["--host", "0.0.0.0", "--port", "5173"],
      autorestart: true,
    },
  ],
};
