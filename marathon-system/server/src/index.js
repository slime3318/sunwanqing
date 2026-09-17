import { createApp } from './app.js';
import { connectDatabase } from './config/db.js';
import { env } from './config/env.js';

async function bootstrap() {
  await connectDatabase();
  console.info('[db] MongoDB 已连接');

  const app = createApp();
  const server = app.listen(env.port, () => {
    console.info(`[server] http://localhost:${env.port}/api  (${env.nodeEnv})`);
  });

  const shutdown = async (signal) => {
    console.info(`[server] 收到 ${signal}，正在关闭...`);
    server.close(async () => {
      const { disconnectDatabase } = await import('./config/db.js');
      await disconnectDatabase();
      process.exit(0);
    });
  };

  ['SIGINT', 'SIGTERM'].forEach((signal) => process.on(signal, () => shutdown(signal)));
}

bootstrap().catch((error) => {
  console.error('[server] 启动失败', error);
  process.exit(1);
});
