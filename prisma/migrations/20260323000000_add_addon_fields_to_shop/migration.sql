-- AlterTable: add addon fields to Shop
ALTER TABLE "Shop" ADD COLUMN "addonActive" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Shop" ADD COLUMN "addonSubscriptionId" TEXT;
