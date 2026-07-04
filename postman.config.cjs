module.exports = {
  command: 'npx playwright test',
  targets: {
    default: {
      environment: 'Local',
      collections: ['User Permissions API', 'Auth API'],
    },
    staging: {
      environment: 'Staging',
      collections: ['User Permissions API', 'Auth API'],
    },
    production: {
      environment: 'Production',
      collections: ['User Permissions API', 'Auth API'],
    },
  },
  filters: {
    urlPatterns: [
      'localhost:3000/api',
      'api.myapp.com',
    ],
    excludePatterns: [
      'fonts.googleapis.com',
      'fonts.gstatic.com',
      'analytics.google.com',
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    headers: {},
  },
};
