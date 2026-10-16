import { createDatabase } from './index.ts';
import { seedDemoBillingPlan } from './seeds/billing-plan.ts';

const url = process.env.DATABASE_URL;
if (!url) throw new Error('DATABASE_URL is required.');
const orm = await createDatabase(url, { snapshotOnMigrate: false });
try {
  console.log(
    `Demo billing plan exists at ID ${await seedDemoBillingPlan(orm)}. Existing terms were preserved.`,
  );
} finally {
  await orm.close(true);
}
