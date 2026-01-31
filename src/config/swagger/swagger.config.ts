import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('API App de Buses')
    .setDescription('Documentación de la API REST de APP de Buses')
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Introduce el JWT usando el esquema: Bearer <token>',
      },
      'access-token', // Este nombre se usa en @ApiBearerAuth()
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);

  document.tags = [
    { name: 'Auth' },
    { name: 'Roles' },
    { name: 'Users' },
    { name: 'Bank Accounts' },
    { name: 'Companies' },
    { name: 'Owners' },
    { name: 'Places' },
    { name: 'Offices' },
    { name: 'Cashiers' },

    { name: 'Routes' },
    { name: 'Routes: In App' },
    { name: 'Routes: For Cashier' },

    { name: 'Buses' },

    { name: 'Travels' },
    { name: 'Travels: In App' },
    { name: 'Travels: For Cashiers' },

    { name: 'Tickets' },
    { name: 'Tickets: In App' },
    { name: 'Tickets: For Cashiers' },

    { name: 'Customers' },
    { name: 'Customers: In App' },
    { name: 'Customers: For Cashiers' },

    { name: 'Transactions' },
    { name: 'Files' },
  ];

  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // Mantiene el token cuando se recarga
      supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch'], // sin 'curl'
    },
  });
}
