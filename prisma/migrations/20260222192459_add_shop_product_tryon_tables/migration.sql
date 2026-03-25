-- CreateTable
CREATE TABLE "Shop" (
    "id" TEXT NOT NULL,
    "shopDomain" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "trialEndsAt" TIMESTAMPTZ,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "Shop_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Shop_shopDomain_key" UNIQUE ("shopDomain")
);

-- CreateTable
CREATE TABLE "Product" (
    "id" TEXT NOT NULL,
    "shopDomain" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Product_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Product_shopDomain_productId_key" UNIQUE ("shopDomain", "productId"),
    CONSTRAINT "Product_shopDomain_fkey" FOREIGN KEY ("shopDomain") REFERENCES "Shop" ("shopDomain") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TryOnLog" (
    "id" TEXT NOT NULL,
    "shopDomain" TEXT NOT NULL,
    "productId" TEXT,
    "resultImageUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "errorMessage" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TryOnLog_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TryOnLog_shopDomain_fkey" FOREIGN KEY ("shopDomain") REFERENCES "Shop" ("shopDomain") ON DELETE CASCADE ON UPDATE CASCADE
);
