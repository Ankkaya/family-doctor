-- CreateTable
CREATE TABLE "DictionaryType" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "DictionaryType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DictionaryItem" (
    "id" SERIAL NOT NULL,
    "typeId" INTEGER NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "color" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "DictionaryItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DictionaryType_code_key" ON "DictionaryType"("code");

-- CreateIndex
CREATE INDEX "DictionaryType_deletedAt_idx" ON "DictionaryType"("deletedAt");

-- CreateIndex
CREATE INDEX "DictionaryType_isEnabled_idx" ON "DictionaryType"("isEnabled");

-- CreateIndex
CREATE INDEX "DictionaryType_sort_idx" ON "DictionaryType"("sort");

-- CreateIndex
CREATE INDEX "DictionaryItem_typeId_idx" ON "DictionaryItem"("typeId");

-- CreateIndex
CREATE INDEX "DictionaryItem_deletedAt_idx" ON "DictionaryItem"("deletedAt");

-- CreateIndex
CREATE INDEX "DictionaryItem_isEnabled_idx" ON "DictionaryItem"("isEnabled");

-- CreateIndex
CREATE INDEX "DictionaryItem_sort_idx" ON "DictionaryItem"("sort");

-- AddForeignKey
ALTER TABLE "DictionaryItem" ADD CONSTRAINT "DictionaryItem_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "DictionaryType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
