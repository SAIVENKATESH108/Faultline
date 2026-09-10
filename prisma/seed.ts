import fs from "node:fs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// ─────────────────────────────────────────────────────────────────────────────
// Load environment variables (.env.local)
// ─────────────────────────────────────────────────────────────────────────────

if (fs.existsSync(".env.local") && typeof process.loadEnvFile === "function") {
  process.loadEnvFile(".env.local");
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run seed. Ensure .env.local exists.");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// ─────────────────────────────────────────────────────────────────────────────
// Pointer Arithmetic in C Fixture Data
// ─────────────────────────────────────────────────────────────────────────────

const FIXTURE_SLUG = "pointer-arithmetic-in-c";
const FIXTURE_TITLE = "Pointer Arithmetic in C";
const FIXTURE_DESCRIPTION =
  "Foundations of pointer offsets, scaling by sizeof(T), array-pointer decay, and memory addressing in C.";

const FIXTURE_NODES = [
  {
    key: "node-memory-addressing",
    label: "Memory Addressing & Byte Offsets",
    description: "Contiguous byte-addressable linear memory space in modern architecture.",
    isRoot: true,
  },
  {
    key: "node-type-scaling",
    label: "Type Scaling & sizeof(T)",
    description:
      "Pointer increment ptr + 1 scales address advancement by sizeof(*ptr) bytes rather than 1 byte.",
    isRoot: false,
  },
  {
    key: "node-array-decay",
    label: "Array-to-Pointer Decay",
    description:
      "Implicit conversion of array identifiers to pointers to their first element.",
    isRoot: false,
  },
  {
    key: "node-pointer-subtraction",
    label: "Pointer Subtraction & ptrdiff_t",
    description:
      "Computing element count distance between two pointers within the same contiguous allocation.",
    isRoot: false,
  },
  {
    key: "node-void-pointers",
    label: "Void Pointers & Arbitrary Stride",
    description:
      "Raw memory manipulation (void*, char*) and manual byte-level arithmetic.",
    isRoot: false,
  },
];

const FIXTURE_EDGES = [
  { parentKey: "node-memory-addressing", childKey: "node-type-scaling" },
  { parentKey: "node-memory-addressing", childKey: "node-array-decay" },
  { parentKey: "node-type-scaling", childKey: "node-pointer-subtraction" },
  { parentKey: "node-array-decay", childKey: "node-pointer-subtraction" },
  { parentKey: "node-pointer-subtraction", childKey: "node-void-pointers" },
];

const FIXTURE_QUESTION = {
  stem: "Given an array `int arr[5];` on an architecture where `sizeof(int) == 4`, if `int *ptr = arr;`, what is the byte-level address offset of `*(ptr + 2)` relative to `ptr`?",
  correctAnswer:
    "8 bytes (2 * sizeof(int)), because pointer arithmetic automatically scales the offset by the byte size of the pointed-to type.",
  explanation:
    "In C, adding an integer k to a typed pointer T* advances the underlying memory address by k * sizeof(T) bytes. Since sizeof(int) == 4, (ptr + 2) points 8 bytes past the base address of arr.",
  distractors: [
    {
      text: "2 bytes, because the `+ 2` operation adds 2 directly to the numeric address without considering the type.",
      misconceptionId: "mc-byte-stride-literalism",
    },
    {
      text: "10 bytes, because the array has 5 elements and memory allocations automatically scale offsets by the total buffer capacity.",
      misconceptionId: "mc-buffer-length-scaling",
    },
    {
      text: "0 bytes, because ptr + 2 returns an offset index without dereferencing or changing memory position.",
      misconceptionId: "mc-dereference-offset-confusion",
    },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Seed Function
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`[Seed] Starting seed for topic: "${FIXTURE_TITLE}" (${FIXTURE_SLUG})...`);

  await prisma.$transaction(async (tx) => {
    // 1. Remove existing fixture to allow clean idempotent re-seeding
    await tx.topic.deleteMany({
      where: { slug: FIXTURE_SLUG },
    });

    // 2. Create Topic with source: 'fixture'
    const topic = await tx.topic.create({
      data: {
        slug: FIXTURE_SLUG,
        title: FIXTURE_TITLE,
        description: FIXTURE_DESCRIPTION,
        source: "fixture",
      },
    });

    console.log(`[Seed] Created topic ID: ${topic.id} (source: fixture)`);

    // 3. Create Concept Nodes
    const nodeMap = new Map<string, string>(); // key -> db uuid
    let rootNodeId: string | null = null;

    for (const node of FIXTURE_NODES) {
      const dbNode = await tx.conceptNode.create({
        data: {
          topicId: topic.id,
          label: node.label,
          description: node.description,
        },
      });

      nodeMap.set(node.key, dbNode.id);

      if (node.isRoot) {
        rootNodeId = dbNode.id;
      }
    }

    console.log(`[Seed] Inserted ${FIXTURE_NODES.length} concept nodes`);

    // 4. Create Concept Edges (Parent -> Child)
    for (const edge of FIXTURE_EDGES) {
      const parentId = nodeMap.get(edge.parentKey);
      const childId = nodeMap.get(edge.childKey);

      if (!parentId || !childId) {
        throw new Error(`Invalid edge keys: ${edge.parentKey} -> ${edge.childKey}`);
      }

      await tx.conceptEdge.create({
        data: {
          parentId,
          childId,
        },
      });
    }

    console.log(`[Seed] Inserted ${FIXTURE_EDGES.length} concept edges`);

    // 5. Create Diagnostic Question + Distractors attached to the root node
    const questionAttachNodeId = rootNodeId || nodeMap.values().next().value;
    if (!questionAttachNodeId) {
      throw new Error("Could not determine node ID to attach diagnostic question.");
    }

    const question = await tx.diagnosticQuestion.create({
      data: {
        conceptNodeId: questionAttachNodeId,
        stem: FIXTURE_QUESTION.stem,
        correctAnswer: FIXTURE_QUESTION.correctAnswer,
        explanation: FIXTURE_QUESTION.explanation,
        distractors: {
          create: FIXTURE_QUESTION.distractors.map((d) => ({
            text: d.text,
            misconceptionId: d.misconceptionId,
          })),
        },
      },
    });

    console.log(`[Seed] Created diagnostic question ID: ${question.id} with 3 distractors`);
  });

  console.log(`[Seed] Successfully seeded "${FIXTURE_SLUG}" into PostgreSQL.`);
}

main()
  .catch((e) => {
    console.error("[Seed Error]:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
