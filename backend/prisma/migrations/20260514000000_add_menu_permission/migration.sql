-- AlterTable
ALTER TABLE "Menu" ADD COLUMN "permission" TEXT;

-- CreateIndex
CREATE INDEX "Menu_permission_idx" ON "Menu"("permission");
