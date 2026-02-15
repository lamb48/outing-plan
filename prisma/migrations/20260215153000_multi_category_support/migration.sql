-- AlterTable
ALTER TABLE "plans" ADD COLUMN "categories" TEXT[];

-- MigrateData
UPDATE "plans" SET "categories" = ARRAY["category"];

-- AlterTable
ALTER TABLE "plans" ALTER COLUMN "categories" SET NOT NULL;

-- AlterTable
ALTER TABLE "plans" DROP COLUMN "category";
