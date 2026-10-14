import { databaseOptions } from './src/config.js';

if (!process.env.DATABASE_URL)
  throw new Error('Set DATABASE_URL before running database commands.');
export default databaseOptions(process.env.DATABASE_URL);
