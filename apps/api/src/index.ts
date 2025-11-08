import { createServer } from './app';
import { config } from './config';

const start = async () => {
  try {
    const server = await createServer();

    await server.listen({
      port: config.port,
      host: config.host,
    });

    console.log(`🚀 Server is running at http://${config.host}:${config.port}`);
  } catch (err) {
    console.error('Error starting server:', err);
    process.exit(1);
  }
};

start();
