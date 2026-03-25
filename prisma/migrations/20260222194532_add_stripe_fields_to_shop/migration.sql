-- AlterTable
ALTER TABLE "Shop" ADD COLUMN "currentPeriodEnd" TIMESTAMPTZ;
ALTER TABLE "Shop" ADD COLUMN "stripeCustomerId" TEXT;
ALTER TABLE "Shop" ADD COLUMN "stripeStatus" TEXT;
ALTER TABLE "Shop" ADD COLUMN "stripeSubscriptionId" TEXT;
