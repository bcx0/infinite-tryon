-- AlterTable
ALTER TABLE "Shop" ADD COLUMN "currentPeriodEnd" DATETIME;
ALTER TABLE "Shop" ADD COLUMN "stripeCustomerId" TEXT;
ALTER TABLE "Shop" ADD COLUMN "stripeStatus" TEXT;
ALTER TABLE "Shop" ADD COLUMN "stripeSubscriptionId" TEXT;
