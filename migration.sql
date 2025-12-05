CREATE TABLE "UserNFTs" (
    "ownerFid" BIGINT NOT NULL,
    "nfts" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserNFTs_pkey" PRIMARY KEY ("ownerFid")
);