# Faultline

> **Adaptive Cognitive Compiler & Misconception Diagnosis Engine**  
> *Debug the mind, not just the syntax.* Powered by **Google Gemini 3.5 Lite**, native compilers, and geological concept strata.

---

## 🌟 Overview

Standard developer tools and coding platforms merely compare string outputs against test suites. When code fails, learners often develop incorrect mental models or resort to trial-and-error patching.

**Faultline** treats cognitive misconceptions like compiler faults. It diagnoses the conceptual root cause behind bugs, maps knowledge dependencies as **Geological Concept Strata** (from Bedrock prerequisites to Apex synthesis), compiles code natively across 5 languages with interactive standard input, and provides a **Surgical AI Code Doctor** that isolates and modifies only the faulty lines without wiping user code.

---

## 🚀 Key Features

### 1. 🌋 Geological Cognitive Strata
- **Dynamic Dependency DAG**: Generated on-demand via Gemini 3.5 Lite for any programming topic.
- **Geological Layers**: Concepts are stratified from Depth 0 (Bedrock Foundational Concepts) through transitional intermediate layers to Depth 3 (Apex Synthesis).
- **Adaptive Diagnostic Probes**: Multiple-choice diagnostic questions embedded with cognitive distractors that expose specific mental fallacies.
- **Mastery Progression**: Solved nodes turn emerald **Stable**, dynamically unlocking downstream synthesis nodes.

### 2. 💻 Native Multi-Language Compiler Engine
- **Zero Mock Outputs**: Compiles and executes code using genuine local toolchains:
  - **C**: `gcc -O2 -Wall`
  - **C++**: `g++ -O2 -std=c++17 -Wall`
  - **Python**: `python -u` (Python 3.13)
  - **JavaScript**: Node.js runtime
  - **Java**: `javac` & `java`
- **Interactive Stdin Console**: Expandable standard input drawer to pipe user input into running programs (`scanf`, `cin`, `input()`).
- **Live Performance Metrics**: Real-time measurement of compilation time (ms), execution run time (ms), and process exit codes.

### 3. ⚡ $O(1)$ LRU Execution Cache
- High-performance data structure implemented with an **Object-Oriented Doubly-Linked List + Hash Map**.
- Generates a deterministic SHA-256 fingerprint from `language + code + stdin`.
- Re-executing identical solutions runs in **< 1ms** with an instant `⚡ Cached` badge.

### 4. 🩺 Surgical AI Code Doctor
- Pinpoints the exact line range (e.g. `Lines 3 to 4`) where the mental model broke down.
- Visual side-by-side Old vs. Fix diff highlighting flawed statements.
- **Line Splicing**: Clicking `✨ Replace Line X Only` splices only the affected lines into the editor buffer, preserving all surrounding imports, comments, and functions.

### 5. 📖 Misconception Codex
- Curated compendium of notorious programming cognitive traps vs. correct mental shifts.
- Contrasts flawed anti-patterns with sound engineering patterns.
- Direct links to experiment with each misconception in the live terminal.

### 6. 🌓 Dual Palette Harmony
- **Night Theme**: Pure black `#000000` base with glowing sapphire, ruby, amber, and emerald accents.
- **Day Theme**: Crisp white `#ffffff` cards and high-contrast typography engineered for bright environments.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 15 (App Router, Turbopack)
- **Language**: TypeScript 5.7+
- **Styling**: Tailwind CSS v4, Vanilla CSS Design Tokens
- **AI Diagnostics**: Google Gemini 3.5 Lite (`@google/genai`)
- **3D Graphics**: Three.js, React Three Fiber (`@react-three/fiber`)
- **Database & ORM**: PostgreSQL, Prisma ORM
- **State Management & Caching**: Zustand, React Query (`@tanstack/react-query`)

---

## 📦 Getting Started

### Prerequisites
- Node.js 18+ (Node.js 20+ recommended)
- Native compilers (GCC/MinGW, Python 3, JDK) installed and on PATH

### 1. Clone the Repository
```bash
git clone https://github.com/SAIVENKATESH108/Faultline.git
cd Faultline
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
Create a `.env.local` file in the root directory:
```env
GEMINI_API_KEY=your_gemini_api_key_here
DATABASE_URL=postgresql://user:password@localhost:5432/faultline
```

### 4. Run the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🗺️ Project Structure

```
Faultline/
├── app/
│   ├── page.tsx            # Landing Page & Feature Showcase
│   ├── layout.tsx          # Root Layout with Viewport & SEO metadata
│   ├── strata/page.tsx     # Concept Strata Explorer & Diagnostic Probes
│   ├── terminal/page.tsx   # Live Compiler & Surgical AI Doctor
│   ├── codex/page.tsx      # Misconception Codex Encyclopedia
│   └── api/
│       ├── compile/        # Native Multi-Language Compilation Endpoint
│       ├── concept-tree/   # Gemini Strata DAG Synthesis
│       ├── diagnose-code/  # Surgical AI Code Doctor Endpoint
│       └── remediate/      # Cognitive Misconception Remediation
├── components/
│   ├── ConceptTree.tsx     # Interactive Geological Strata Visualization
│   ├── HeroScene.tsx       # 3D Fractured Crystal Emblem
│   ├── Navbar.tsx          # Global Navigation Bar with Route Tracking
│   ├── QuestionCard.tsx    # Diagnostic Probe Question & Flipped Remediation
│   ├── ThemeToggle.tsx     # Day/Night Global Theme Switcher
│   └── ui/                 # Reusable UI Primitives (Button, Badge, etc.)
├── lib/
│   ├── services/compiler/  # OOP Drivers & LRU Execution Cache Data Structure
│   └── validation/         # Zod Schemas for Type-Safe API Payloads
└── public/
    ├── showcase/           # 13 Verified System Screenshots
    └── favicon.png         # Faultline Favicon
```

---

## 📄 License
MIT License. Built for the Prometheus Hackathon.
