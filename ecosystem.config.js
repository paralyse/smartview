module.exports = {
    apps: [
        {
            name: 'smartview',
            script: './app.was.js',
            instances: 2,
            exec_mode: 'cluster',
            wait_ready: true,
            listen_timeout: 50000,
            kill_timeout: 5000,
			output: "./logs/out.log",
			error: "./logs/error.log",
			merge_logs: true,
			dateFormat: "YYYY-MM-DD_HH-mm-ss",
        }
    ]
}
