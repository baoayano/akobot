module.exports = {
    apps: [
        {
            name: 'akobot',
            script: 'dist/src/index.js',
            watch: false,
            env: {
                NODE_ENV: 'production',
            },
        },
    ],
}