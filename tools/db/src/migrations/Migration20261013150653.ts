import { Migration } from '@mikro-orm/migrations';

export class Migration20261013150653 extends Migration {

  override name = 'Migration20261013150653';

  override up(): void | Promise<void> {
    this.addSql(`alter table "classrooms" add "invitation_hash" varchar(64) null, add "invitation_expires_at" timestamptz null;`);
    this.addSql(`alter table "classrooms" add constraint "classrooms_invitation_hash_unique" unique ("invitation_hash");`);
  }

  override down(): void | Promise<void> {
    this.addSql(`alter table "classrooms" drop constraint "classrooms_invitation_hash_unique";`);
    this.addSql(`alter table "classrooms" drop column "invitation_hash", drop column "invitation_expires_at";`);
  }

}
