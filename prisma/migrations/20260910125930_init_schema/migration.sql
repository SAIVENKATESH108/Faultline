-- CreateTable
CREATE TABLE "topics" (
    "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
    "slug"        TEXT         NOT NULL,
    "title"       TEXT         NOT NULL,
    "description" TEXT,
    "source"      TEXT         NOT NULL DEFAULT 'generated',
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"  TIMESTAMP(3) NOT NULL,

    CONSTRAINT "topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "concept_nodes" (
    "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
    "topic_id"    UUID         NOT NULL,
    "label"       TEXT         NOT NULL,
    "description" TEXT,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "concept_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "concept_edges" (
    "id"        UUID NOT NULL DEFAULT gen_random_uuid(),
    "parent_id" UUID NOT NULL,
    "child_id"  UUID NOT NULL,

    CONSTRAINT "concept_edges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "diagnostic_questions" (
    "id"              UUID         NOT NULL DEFAULT gen_random_uuid(),
    "concept_node_id" UUID         NOT NULL,
    "stem"            TEXT         NOT NULL,
    "correct_answer"  TEXT         NOT NULL,
    "explanation"     TEXT,
    "created_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "diagnostic_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "distractors" (
    "id"               UUID NOT NULL DEFAULT gen_random_uuid(),
    "question_id"      UUID NOT NULL,
    "text"             TEXT NOT NULL,
    "misconception_id" TEXT NOT NULL,

    CONSTRAINT "distractors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "remediation_cache" (
    "id"               UUID         NOT NULL DEFAULT gen_random_uuid(),
    "question_id"      UUID         NOT NULL,
    "misconception_id" TEXT         NOT NULL,
    "content"          TEXT         NOT NULL,
    "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "remediation_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "topics_slug_key" ON "topics"("slug");

-- CreateIndex
CREATE INDEX "topics_slug_idx" ON "topics"("slug");

-- CreateIndex
CREATE INDEX "concept_edges_child_id_idx" ON "concept_edges"("child_id");

-- CreateIndex
CREATE UNIQUE INDEX "remediation_cache_question_id_misconception_id_key"
    ON "remediation_cache"("question_id", "misconception_id");

-- AddForeignKey
ALTER TABLE "concept_nodes"
    ADD CONSTRAINT "concept_nodes_topic_id_fkey"
    FOREIGN KEY ("topic_id") REFERENCES "topics"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concept_edges"
    ADD CONSTRAINT "concept_edges_parent_id_fkey"
    FOREIGN KEY ("parent_id") REFERENCES "concept_nodes"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "concept_edges"
    ADD CONSTRAINT "concept_edges_child_id_fkey"
    FOREIGN KEY ("child_id") REFERENCES "concept_nodes"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "diagnostic_questions"
    ADD CONSTRAINT "diagnostic_questions_concept_node_id_fkey"
    FOREIGN KEY ("concept_node_id") REFERENCES "concept_nodes"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distractors"
    ADD CONSTRAINT "distractors_question_id_fkey"
    FOREIGN KEY ("question_id") REFERENCES "diagnostic_questions"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "remediation_cache"
    ADD CONSTRAINT "remediation_cache_question_id_fkey"
    FOREIGN KEY ("question_id") REFERENCES "diagnostic_questions"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
