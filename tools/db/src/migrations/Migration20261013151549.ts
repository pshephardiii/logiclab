import { Migration } from '@mikro-orm/migrations';

export class Migration20261013151549 extends Migration {

  override name = 'Migration20261013151549';

  override up(): void | Promise<void> {
    this.addSql(`
      create table "enrollments" (
        "id" uuid not null default gen_random_uuid(),
        "classroom_id" uuid not null,
        "student_id" uuid not null,
        "created_at" timestamptz not null default now(),
        primary key ("id")
      );
    `);
    this.addSql(`create index "enrollments_student_id_index" on "enrollments" ("student_id");`);
    this.addSql(`
      alter table "enrollments"
        add constraint "enrollments_classroom_student_unique" unique ("classroom_id", "student_id");
    `);

    this.addSql(`
      alter table "enrollments"
        add constraint "enrollments_classroom_id_fkey"
          foreign key ("classroom_id")
          references "classrooms" ("id")
          on delete cascade;
    `);
    this.addSql(`
      alter table "enrollments"
        add constraint "enrollments_student_id_fkey"
          foreign key ("student_id")
          references "users" ("id")
          on delete cascade;
    `);
  }

  override down(): void | Promise<void> {
    this.addSql(`drop table if exists "enrollments" cascade;`);
  }

}
