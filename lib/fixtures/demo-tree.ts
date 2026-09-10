import type { ConceptTree } from "@/lib/types";

/**
 * Pre-baked demo concept tree for "Recursion & Inductive Reasoning".
 * Strictly satisfies ConceptTreeSchema:
 * - 5 nodes (within 4-6 range)
 * - Exactly one root node ("node-base-case")
 * - Non-root nodes reference valid parentIds
 * - Exactly 1 diagnostic question
 * - Exactly 3 distractors with non-empty, distinct misconceptionIds
 */
export const DEMO_CONCEPT_TREE: ConceptTree = {
  topic: "Recursion & Inductive Reasoning",
  nodes: [
    {
      id: "node-base-case",
      label: "Base Case Verification",
      description: "The foundational bedrock halting condition that terminates recursive descent.",
      parentIds: [],
    },
    {
      id: "node-call-stack",
      label: "Call Stack Execution Context",
      description: "Memory frames pushed and popped across recursive invocations.",
      parentIds: ["node-base-case"],
    },
    {
      id: "node-rec-step",
      label: "Inductive Step Decomposition",
      description: "Reducing a problem instance to smaller, self-similar sub-problems.",
      parentIds: ["node-base-case"],
    },
    {
      id: "node-termination",
      label: "Termination & Convergence Proofs",
      description: "Guaranteeing that input parameters strictly converge toward the base case.",
      parentIds: ["node-call-stack", "node-rec-step"],
    },
    {
      id: "node-divide-conquer",
      label: "Divide-and-Conquer Synthesis",
      description: "Composing multi-branch recursive solutions with optimal recurrence relations.",
      parentIds: ["node-termination"],
    },
  ],
  edges: [
    { parentId: "node-base-case", childId: "node-call-stack" },
    { parentId: "node-base-case", childId: "node-rec-step" },
    { parentId: "node-call-stack", childId: "node-termination" },
    { parentId: "node-rec-step", childId: "node-termination" },
    { parentId: "node-termination", childId: "node-divide-conquer" },
  ],
  question: {
    stem: "In a recursive function without a proper base guard, what directly causes a 'Maximum call stack size exceeded' runtime error when called with an invalid input?",
    correctAnswer:
      "Unbounded recursive calls push execution frames until stack memory limit is breached.",
    explanation:
      "Every recursive call allocates a new stack frame containing local variables and return addresses. Without reaching a terminating base condition, stack memory is completely exhausted.",
    distractors: [
      {
        text: "The heap runs out of pointers because functions must store recursion trees in global heap objects.",
        misconceptionId: "mc-stack-heap-confusion",
      },
      {
        text: "The processor detects an infinite loop and forcibly terminates the thread's clock cycle.",
        misconceptionId: "mc-hardware-halting-illusion",
      },
      {
        text: "Negative numbers cause recursive decrement operations to wrap to the largest 64-bit integer.",
        misconceptionId: "mc-integer-wrap-assumption",
      },
    ],
  },
};
