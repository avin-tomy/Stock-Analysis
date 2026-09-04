import { env } from './config/env.js';
import { connectDb } from './db/connect.js';
import { app } from './app.js';

async function main() {
  await connectDb();
  console.log('Connected to MongoDB');

  app.listen(env.port, () => {
    console.log(`Server listening on http://localhost:${env.port}`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
