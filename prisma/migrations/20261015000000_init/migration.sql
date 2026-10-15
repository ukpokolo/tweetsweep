-- pgvector provides the "vector" column type used for embeddings.
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TweetSource" AS ENUM ('TIMELINE', 'ARCHIVE');

-- CreateEnum
CREATE TYPE "Decision" AS ENUM ('PENDING', 'APPROVED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'RUNNING', 'DONE', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ItemStatus" AS ENUM ('QUEUED', 'DELETED', 'ALREADY_GONE', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "xUserId" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "XAccount" (
    "userId" TEXT NOT NULL,
    "accessTokenEnc" BYTEA NOT NULL,
    "refreshTokenEnc" BYTEA NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "scopes" TEXT[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "XAccount_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "Tweet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "xTweetId" TEXT NOT NULL,
    "source" "TweetSource" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "hashtags" TEXT[],
    "mentions" TEXT[],
    "inReplyToId" TEXT,
    "quotedId" TEXT,
    "textEnc" BYTEA,
    "contentExpiresAt" TIMESTAMP(3) NOT NULL,
    "embedding" vector(1024),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Tweet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchRun" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "concept" TEXT,
    "filters" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL,
    "searchId" TEXT NOT NULL,
    "tweetId" TEXT NOT NULL,
    "similarity" DOUBLE PRECISION,
    "label" TEXT,
    "confidence" DOUBLE PRECISION,
    "reason" TEXT,
    "decision" "Decision" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "Match_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeletionJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dryRun" BOOLEAN NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "backupConfirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeletionJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeletionItem" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "xTweetId" TEXT NOT NULL,
    "status" "ItemStatus" NOT NULL DEFAULT 'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,

    CONSTRAINT "DeletionItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_xUserId_key" ON "User"("xUserId");

-- CreateIndex
CREATE INDEX "Tweet_userId_createdAt_idx" ON "Tweet"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Tweet_contentExpiresAt_idx" ON "Tweet"("contentExpiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "Tweet_userId_xTweetId_key" ON "Tweet"("userId", "xTweetId");

-- CreateIndex
CREATE INDEX "SearchRun_userId_createdAt_idx" ON "SearchRun"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Match_searchId_decision_idx" ON "Match"("searchId", "decision");

-- CreateIndex
CREATE UNIQUE INDEX "Match_searchId_tweetId_key" ON "Match"("searchId", "tweetId");

-- CreateIndex
CREATE INDEX "DeletionJob_userId_createdAt_idx" ON "DeletionJob"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "DeletionItem_jobId_status_idx" ON "DeletionItem"("jobId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "DeletionItem_jobId_xTweetId_key" ON "DeletionItem"("jobId", "xTweetId");

-- AddForeignKey
ALTER TABLE "XAccount" ADD CONSTRAINT "XAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tweet" ADD CONSTRAINT "Tweet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SearchRun" ADD CONSTRAINT "SearchRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_searchId_fkey" FOREIGN KEY ("searchId") REFERENCES "SearchRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_tweetId_fkey" FOREIGN KEY ("tweetId") REFERENCES "Tweet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeletionJob" ADD CONSTRAINT "DeletionJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeletionItem" ADD CONSTRAINT "DeletionItem_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "DeletionJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Approximate nearest-neighbour index for semantic search.
-- HNSW with cosine distance (vector_cosine_ops) matches how we query: embedding <=> query.
CREATE INDEX "Tweet_embedding_hnsw_idx" ON "Tweet" USING hnsw ("embedding" vector_cosine_ops);
