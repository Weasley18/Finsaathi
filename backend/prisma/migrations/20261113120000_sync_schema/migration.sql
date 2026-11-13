-- CreateEnum
CREATE TYPE "ChatType" AS ENUM ('AI_CHAT', 'ADVISOR_CLONE', 'COPILOT');

-- CreateEnum
CREATE TYPE "ContentStatus" AS ENUM ('DRAFT', 'REVIEW', 'PUBLISHED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "FeeModel" AS ENUM ('NGO_SUBSIDIZED', 'CSR_FUNDED', 'FLAT_FEE', 'B2B_SPONSORED');

-- AlterEnum
ALTER TYPE "IncomeRange" ADD VALUE 'FROM_1L_TO_2_5L';

-- AlterEnum
ALTER TYPE "IncomeRange" ADD VALUE 'FROM_2_5L_TO_5L';

-- AlterEnum
ALTER TYPE "IncomeRange" ADD VALUE 'FROM_5L_TO_10L';

-- AlterEnum
ALTER TYPE "IncomeRange" ADD VALUE 'ABOVE_10L';

-- DropIndex
DROP INDEX "otp_codes_phone_code_idx";

-- AlterTable
ALTER TABLE "chat_messages" ADD COLUMN     "chatRoomId" TEXT;

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "reviewNote" TEXT;

-- AlterTable
ALTER TABLE "otp_codes" ADD COLUMN     "attempts" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "areasOfInterest" TEXT[],
ADD COLUMN     "legalDocType" TEXT,
ADD COLUMN     "legalDocNumber" TEXT,
ADD COLUMN     "registeredAddr" TEXT,
ADD COLUMN     "regulatoryRegNumber" TEXT,
ADD COLUMN     "complianceOfficerEmail" TEXT,
ADD COLUMN     "complianceOfficerPhone" TEXT,
ADD COLUMN     "technicalContactEmail" TEXT,
ADD COLUMN     "technicalContactPhone" TEXT,
ADD COLUMN     "digitalAcceptanceOfTerms" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasSignedDataProcessAgreement" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasSignedNoPIIAccess" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasSignedNoDataResale" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hasSignedBreachReport" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "webhookUrl" TEXT,
ADD COLUMN     "oauthCompatible" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "advisor_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessAddress" TEXT NOT NULL,
    "professionalEmail" TEXT NOT NULL,
    "sebiCertificateIssueDate" TIMESTAMP(3) NOT NULL,
    "sebiCertificateExpiryDate" TIMESTAMP(3) NOT NULL,
    "baslMembershipId" TEXT NOT NULL,
    "highestQualification" TEXT NOT NULL,
    "optionalCertifications" TEXT[],
    "languagesSpoken" TEXT[],
    "areasOfExpertise" TEXT[],
    "feeModel" "FeeModel" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "advisor_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_rooms" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT 'New Chat',
    "type" "ChatType" NOT NULL DEFAULT 'AI_CHAT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chat_rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "client_flags" (
    "id" TEXT NOT NULL,
    "advisorId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "status" TEXT NOT NULL DEFAULT 'open',
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "client_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_generations" (
    "id" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "difficulty" "DifficultyLevel" NOT NULL DEFAULT 'BEGINNER',
    "category" TEXT,
    "generatedTitle" TEXT,
    "generatedContent" TEXT,
    "status" "ContentStatus" NOT NULL DEFAULT 'DRAFT',
    "generatedById" TEXT,
    "reviewedById" TEXT,
    "reviewNote" TEXT,
    "publishedLessonId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_generations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "direct_messages" (
    "id" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "receiverId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "direct_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_progress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "timeSpentSeconds" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "lesson_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_attempts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "selectedIndex" INTEGER NOT NULL,
    "isCorrect" BOOLEAN NOT NULL,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quizzes" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "correctIndex" INTEGER NOT NULL,
    "explanation" TEXT,
    "points" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quizzes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recommendations" (
    "id" TEXT NOT NULL,
    "advisorId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recommendations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_calls" (
    "id" TEXT NOT NULL,
    "advisorId" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 30,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduled_calls_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "advisor_profiles_userId_key" ON "advisor_profiles"("userId");

-- CreateIndex
CREATE INDEX "quizzes_lessonId_idx" ON "quizzes"("lessonId");

-- CreateIndex
CREATE INDEX "quiz_attempts_userId_quizId_idx" ON "quiz_attempts"("userId", "quizId");

-- CreateIndex
CREATE UNIQUE INDEX "lesson_progress_userId_lessonId_key" ON "lesson_progress"("userId", "lessonId");

-- CreateIndex
CREATE INDEX "content_generations_status_idx" ON "content_generations"("status");

-- CreateIndex
CREATE INDEX "chat_rooms_userId_type_updatedAt_idx" ON "chat_rooms"("userId", "type", "updatedAt");

-- CreateIndex
CREATE INDEX "chat_messages_chatRoomId_createdAt_idx" ON "chat_messages"("chatRoomId", "createdAt");

-- CreateIndex
CREATE INDEX "documents_userId_type_idx" ON "documents"("userId", "type");

-- CreateIndex
CREATE INDEX "otp_codes_phone_createdAt_idx" ON "otp_codes"("phone", "createdAt");

-- CreateIndex
CREATE INDEX "direct_messages_senderId_receiverId_createdAt_idx" ON "direct_messages"("senderId", "receiverId", "createdAt");

-- CreateIndex
CREATE INDEX "direct_messages_receiverId_isRead_idx" ON "direct_messages"("receiverId", "isRead");

-- CreateIndex
CREATE INDEX "recommendations_clientId_idx" ON "recommendations"("clientId");

-- CreateIndex
CREATE INDEX "recommendations_advisorId_idx" ON "recommendations"("advisorId");

-- CreateIndex
CREATE INDEX "scheduled_calls_advisorId_scheduledAt_idx" ON "scheduled_calls"("advisorId", "scheduledAt");

-- CreateIndex
CREATE INDEX "scheduled_calls_clientId_idx" ON "scheduled_calls"("clientId");

-- CreateIndex
CREATE INDEX "client_flags_clientId_idx" ON "client_flags"("clientId");

-- CreateIndex
CREATE INDEX "client_flags_status_idx" ON "client_flags"("status");

-- AddForeignKey
ALTER TABLE "advisor_profiles" ADD CONSTRAINT "advisor_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson_progress" ADD CONSTRAINT "lesson_progress_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lessons"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_rooms" ADD CONSTRAINT "chat_rooms_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_messages" ADD CONSTRAINT "chat_messages_chatRoomId_fkey" FOREIGN KEY ("chatRoomId") REFERENCES "chat_rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "direct_messages" ADD CONSTRAINT "direct_messages_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_advisorId_fkey" FOREIGN KEY ("advisorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recommendations" ADD CONSTRAINT "recommendations_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_calls" ADD CONSTRAINT "scheduled_calls_advisorId_fkey" FOREIGN KEY ("advisorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_calls" ADD CONSTRAINT "scheduled_calls_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_flags" ADD CONSTRAINT "client_flags_advisorId_fkey" FOREIGN KEY ("advisorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "client_flags" ADD CONSTRAINT "client_flags_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
