import { Migration } from '@mikro-orm/migrations';

export class Migration20261016191251 extends Migration {

  override name = 'Migration20261016191251';

  override up(): void | Promise<void> {
    this.addSql(`alter table "class_purchases" add "request_id" uuid null;`);
    this.addSql(`update "class_purchases" set "request_id" = "id";`);
    this.addSql(`alter table "class_purchases" alter column "request_id" set not null;`);
    this.addSql(`alter table "class_purchases" add constraint "class_purchases_payer_request_unique" unique ("payer_id", "request_id");`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "class_purchases" drop constraint "class_purchases_payer_request_unique";`);
    this.addSql(`alter table "class_purchases" drop column "request_id";`);
  }

}
