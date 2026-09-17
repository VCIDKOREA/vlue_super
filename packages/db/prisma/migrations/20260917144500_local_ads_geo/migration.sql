ALTER TABLE "local_ads"
ADD COLUMN "latitude" DOUBLE PRECISION,
ADD COLUMN "longitude" DOUBLE PRECISION;

CREATE INDEX "local_ads_latitude_longitude_idx"
ON "local_ads"("latitude", "longitude");
