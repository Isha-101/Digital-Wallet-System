const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Digital Wallet API',
      version: '1.0.0',
      description: 'A comprehensive digital wallet system with fraud detection capabilities',
      contact: {
        name: 'API Support',
        email: 'support@digitalwallet.com'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            username: { type: 'string' },
            email: { type: 'string' },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Wallet: {
          type: 'object',
          properties: {
            userId: { type: 'string' },
            balances: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  currency: { type: 'string' },
                  amount: { type: 'number' }
                }
              }
            }
          }
        },
        Transaction: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            fromUserId: { type: 'string' },
            toUserId: { type: 'string' },
            type: { type: 'string', enum: ['deposit', 'withdrawal', 'transfer'] },
            amount: { type: 'number' },
            currency: { type: 'string' },
            description: { type: 'string' },
            status: { type: 'string', enum: ['pending', 'completed', 'failed', 'cancelled'] },
            isFlagged: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' }
          }
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            details: { type: 'array', items: { type: 'string' } }
          }
        }
      }
    },
    tags: [
      { name: 'Authentication', description: 'User authentication endpoints' },
      { name: 'Wallet', description: 'Wallet operations endpoints' },
      { name: 'Transactions', description: 'Transaction management endpoints' },
      { name: 'Admin', description: 'Admin and reporting endpoints' }
    ]
  },
  apis: ['./routes/*.js'] // Path to the API docs
};

module.exports = swaggerJsdoc(options);
