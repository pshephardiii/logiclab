import { Migration } from '@mikro-orm/migrations';

export class Migration20261016185458 extends Migration {

  override name = 'Migration20261016185458';

  override up(): void | Promise<void> {
    this.addSql(`
      alter table "payment_events"
        add constraint "payment_events_provider_check"
          check (provider in ('simulator'));
    `);

    this.addSql(`
      alter table "class_entitlements"
        add constraint "class_entitlements_provider_check"
          check (provider in ('simulator'));
    `);

    this.addSql(`
      alter table "class_purchases"
        add constraint "class_purchases_provider_check"
          check (provider in ('simulator'));
    `);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "class_entitlements" drop constraint "class_entitlements_provider_check";`);

    this.addSql(`alter table "class_purchases" drop constraint "class_purchases_provider_check";`);

    this.addSql(`alter table "payment_events" drop constraint "payment_events_provider_check";`);
  }

}
