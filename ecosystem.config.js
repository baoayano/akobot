module.exports = {
    apps: [
        {
            name: 'akobot',
            script: 'dist/index.js',
            watch: false,
            env: {
                NODE_ENV: 'production',
            },
        },
    ],
}