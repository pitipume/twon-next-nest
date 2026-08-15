-- CreateTable
CREATE TABLE "maintenance_config" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "backByAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maintenance_config_pkey" PRIMARY KEY ("id")
);

