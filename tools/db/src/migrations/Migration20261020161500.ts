import { Migration } from '@mikro-orm/migrations';

export class Migration20261020161500 extends Migration {

  override name = 'Migration20261020161500';

  override up(): void | Promise<void> {
    this.addSql(`alter table "job_schedules" drop constraint "job_schedules_type_check";`);
    this.addSql(`
      alter table "job_schedules"
        add constraint "job_schedules_type_check"
        check (job_type in ('billing_reconciliation', 'demo_cleanup'));
    `);

    this.addSql(`alter table "durable_jobs" drop constraint "durable_jobs_type_check";`);
    this.addSql(`
      alter table "durable_jobs"
        add constraint "durable_jobs_type_check"
        check (job_type in ('billing_reconciliation', 'demo_cleanup'));
    `);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "durable_jobs" drop constraint "durable_jobs_type_check";`);
    this.addSql(`
      alter table "durable_jobs"
        add constraint "durable_jobs_type_check"
        check (job_type in ('billing_reconciliation'));
    `);

    this.addSql(`alter table "job_schedules" drop constraint "job_schedules_type_check";`);
    this.addSql(`
      alter table "job_schedules"
        add constraint "job_schedules_type_check"
        check (job_type in ('billing_reconciliation'));
    `);
  }

}
