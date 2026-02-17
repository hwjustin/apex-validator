module.exports = {
  apps: [
    {
      name: 'apex-validator',
      script: './dist/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'development',
      },
      env_production: {
        NODE_ENV: 'production',
      },
      // Restart delay on crash (ms)
      restart_delay: 5000,
      // Kill timeout (ms)
      kill_timeout: 5000,
      // Log configuration
      error_file: './logs/error.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      // Merge logs from all instances
      merge_logs: true,
    },
  ],
};
