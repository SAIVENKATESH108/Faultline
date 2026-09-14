"""
Faultline Complete Engineering Specification & System Documentation Generator
Uses ReportLab to produce a pixel-perfect, publication-grade 9-page PDF matching
the exact structure, double borders, typography, quote boxes, tables, and wide screenshots
of ContinuityGuardian_System_Documentation.pdf.
"""

import os
from reportlab.lib.pagesizes import letter
from reportlab.lib.colors import HexColor, white
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak
)
from reportlab.pdfgen import canvas

WORKSPACE_DIR = r"d:\Freshstart\Promethius-hackthon"
DOCS_DIR = os.path.join(WORKSPACE_DIR, "docs")
PUBLIC_DIR = os.path.join(WORKSPACE_DIR, "public")
SHOWCASE_DIR = os.path.join(PUBLIC_DIR, "showcase")

PDF_OUT_DOCS = os.path.join(DOCS_DIR, "Faultline_System_Documentation.pdf")
PDF_OUT_PUBLIC = os.path.join(PUBLIC_DIR, "Faultline_System_Documentation.pdf")


class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to dynamically compute total page count and draw
    exact double border, running headers, and running footers on every page.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_decorations(self, total_pages):
        self.saveState()

        # Double border rectangle (exact points matching ContinuityGuardian)
        # Outer border: Dark Navy #1e1b4b
        self.setStrokeColor(HexColor("#1e1b4b"))
        self.setLineWidth(1.5)
        self.rect(36, 36, 540, 720)

        # Inner border: Violet #7c3aed
        self.setStrokeColor(HexColor("#7c3aed"))
        self.setLineWidth(1.0)
        self.rect(39, 39, 534, 714)

        page_num = self._pageNumber
        if page_num > 1:
            # Running header text
            self.setFont("Helvetica-Bold", 8.5)
            self.setFillColor(HexColor("#1e1b4b"))
            self.drawString(50, 765, "Faultline — Complete Engineering Specification & System Documentation")

            self.setFont("Helvetica", 8.5)
            self.setFillColor(HexColor("#64748b"))
            self.drawRightString(562, 765, "Lead Architect: V.A. Sai Venkatesh")

            # Horizontal line below header
            self.setStrokeColor(HexColor("#cbd5e1"))
            self.setLineWidth(0.5)
            self.line(50, 760, 562, 760)

            # Horizontal line above footer
            self.line(50, 30, 562, 30)

            # Running footer text
            self.setFont("Helvetica", 7.5)
            self.setFillColor(HexColor("#64748b"))
            self.drawString(50, 20, "CONFIDENTIAL & PROPRIETARY — Faultline Cognitive Diagnostic Systems v1.0")
            self.drawRightString(562, 20, f"Page {page_num} of {total_pages}")
        else:
            # Page 1 footer
            self.setFont("Helvetica", 7.5)
            self.setFillColor(HexColor("#64748b"))
            self.drawString(50, 20, "CONFIDENTIAL & PROPRIETARY — Faultline Cognitive Diagnostic Systems v1.0")
            self.drawRightString(562, 20, f"Page 1 of {total_pages}")

        self.restoreState()


def create_quote_box(title, text, border_color="#8b5cf6", bg_color="#faf5ff", title_color="#6d28d9", text_color="#4c1d95"):
    """Creates a stylized architect quote box matching ContinuityGuardian."""
    content = [
        Paragraph(f"<b>★ {title}</b>", ParagraphStyle(
            "QuoteTitle", fontName="Helvetica-Bold", fontSize=8.5, leading=11, textColor=HexColor(title_color)
        )),
        Spacer(1, 3),
        Paragraph(f"<i>\"{text}\"</i>", ParagraphStyle(
            "QuoteBody", fontName="Courier-Oblique", fontSize=8.0, leading=10.5, textColor=HexColor(text_color)
        ))
    ]
    t = Table([[content]], colWidths=[508])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), HexColor(bg_color)),
        ('BOX', (0, 0), (-1, -1), 1.5, HexColor(border_color)),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    return t


def build_pdf():
    doc = SimpleDocTemplate(
        PDF_OUT_DOCS,
        pagesize=letter,
        leftMargin=52,
        rightMargin=52,
        topMargin=48,
        bottomMargin=46
    )

    story = []

    # Typography Styles
    title_style = ParagraphStyle("DocTitle", fontName="Helvetica-Bold", fontSize=20, leading=23, textColor=HexColor("#1e1b4b"))
    subtitle_style = ParagraphStyle("DocSubtitle", fontName="Helvetica", fontSize=9.5, leading=13.5, textColor=HexColor("#475569"))
    section_h1 = ParagraphStyle("SectionH1", fontName="Helvetica-Bold", fontSize=14.5, leading=17.5, textColor=HexColor("#1e1b4b"))
    section_h2 = ParagraphStyle("SectionH2", fontName="Helvetica-Bold", fontSize=12.0, leading=15.0, textColor=HexColor("#6d28d9"))
    body_p = ParagraphStyle("BodyP", fontName="Helvetica", fontSize=8.5, leading=12.5, textColor=HexColor("#334155"))
    bullet_p = ParagraphStyle("BulletP", fontName="Helvetica", fontSize=8.2, leading=11.5, textColor=HexColor("#334155"), leftIndent=12)
    tbl_cell = ParagraphStyle("TblCell", fontName="Helvetica", fontSize=8.0, leading=10.5, textColor=HexColor("#1e293b"))
    tbl_cell_bold = ParagraphStyle("TblCellBold", fontName="Helvetica-Bold", fontSize=8.0, leading=10.5, textColor=HexColor("#0f172a"))
    tbl_header = ParagraphStyle("TblHdr", fontName="Helvetica-Bold", fontSize=8.2, leading=10.5, textColor=white)
    code_cell = ParagraphStyle("CodeCell", fontName="Courier", fontSize=7.5, leading=9.5, textColor=HexColor("#0f172a"))

    # =========================================================================
    # PAGE 1: COVER & EXECUTIVE SUMMARY
    # =========================================================================
    logo_path = os.path.join(PUBLIC_DIR, "favicon.png")
    if os.path.exists(logo_path):
        story.append(Image(logo_path, width=72, height=72, hAlign='CENTER'))
        story.append(Spacer(1, 10))

    story.append(Paragraph("Continuity Guardian — Complete Engineering<br/>Specification & System Documentation", title_style))
    # Replace title text with Faultline
    story[-1] = Paragraph("Faultline — Complete Engineering<br/>Specification & System Documentation", title_style)
    story.append(Spacer(1, 5))
    story.append(Paragraph("Cognitive Diagnostic Engine, Adaptive Knowledge Strata DAG, Multi-Language Native Sandbox Compiler & Surgical AI Code Doctor", subtitle_style))
    story.append(Spacer(1, 12))

    # Specification Metadata Table
    meta_data = [
        [Paragraph("Lead Engineer & Architect:", tbl_cell_bold), Paragraph("V.A. SAI VENKATESH", tbl_cell_bold)],
        [Paragraph("System Architecture:", tbl_cell_bold), Paragraph("Google Gemini 3.5 Lite, Next.js 15 App Router, Prisma ORM, PostgreSQL, Sandboxed Child Process Toolchain", tbl_cell)],
        [Paragraph("Production Web Stack:", tbl_cell_bold), Paragraph("Obsidian Studio & Precision Day Dual UI/UX, Screenplay Code Slate, Unified AST Diff Splicer, Stdin Console", tbl_cell)],
        [Paragraph("Target Domain:", tbl_cell_bold), Paragraph("Computer Science Pedagogy, Algorithmic Misconception Remediation, Diagnostic Compiler Infrastructure", tbl_cell)],
        [Paragraph("Document Classification:", tbl_cell_bold), Paragraph("Enterprise Engineering Specification v1.0 (September 2026)", tbl_cell)]
    ]
    t_meta = Table(meta_data, colWidths=[150, 358])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), HexColor('#f8fafc')),
        ('BOX', (0, 0), (-1, -1), 1, HexColor('#cbd5e1')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, HexColor('#e2e8f0')),
        ('TOPPADDING', (0, 0), (-1, -1), 4.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4.5),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 10))

    # Lead Architect Vision Box
    vision_text = (
        "Traditional compilers and online judges fail computer science pedagogy because they operate strictly as binary syntax verifiers: "
        "your code either passes or fails with an opaque stack trace or timeout. A student who conflates an off-by-one pointer index with "
        "an invariant violation receives zero pedagogical insight. Faultline fundamentally shifts the compiler paradigm: by fusing an "
        "Adaptive Knowledge Strata DAG, real-time sandboxed multi-language execution, probe distractor analysis, and surgical line-level code repair, "
        "we isolate the student's underlying cognitive misconception and remediate the mental model before frustration sets in."
    )
    story.append(create_quote_box(
        "LEAD ARCHITECT SYSTEM VISION — V.A. Sai Venkatesh (Lead Architect)",
        vision_text,
        border_color="#f59e0b",
        bg_color="#fffbeb",
        title_color="#b45309",
        text_color="#78350f"
    ))
    story.append(Spacer(1, 12))

    story.append(Paragraph("Executive Overview: The Algorithmic Pedagogy & Misconception Crisis", section_h1))
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        "In software engineering education and technical talent pipelines, syntax errors are trivial, but <b>conceptual misconceptions</b> "
        "are catastrophic. Novice programmers waste countless hours debugging code not because they lack language grammar, but because their internal "
        "mental models of memory references, pointer mutations, recursive unwinding, and algorithmic invariants are fundamentally broken.",
        body_p
    ))
    story.append(Spacer(1, 5))
    story.append(Paragraph(
        "Traditional automated judges merely compare <code>stdout</code> against expected fixtures, offering unhelpful boolean rejections "
        "(<code>Wrong Answer</code> or <code>Time Limit Exceeded</code>). The compiler remains completely blind to <i>why</i> the student arrived at the flawed "
        "implementation. Faultline eliminates this pedagogical disconnect through a 5-pillar closed-loop remediation engine that isolates behavioral anomalies, "
        "pinpoints cognitive distractors in a prerequisite DAG, executes native code with interactive stdin, and surgically splices corrections in-place.",
        body_p
    ))
    story.append(PageBreak())

    # =========================================================================
    # PAGE 2: ARCHITECTURE & CS FOUNDATIONS
    # =========================================================================
    story.append(Paragraph("System Architecture & Computer Science Foundations", section_h1))
    story.append(Spacer(1, 3))
    story.append(Paragraph(
        "Faultline is organized as a 4-tier distributed system with strict boundary separation between Presentation, API Routing, Sandbox Execution, and LLM Diagnostic Reasoning layers.",
        body_p
    ))
    story.append(Spacer(1, 7))

    # CS Patterns Table
    cs_headers = [Paragraph("Computer Science Pattern", tbl_header), Paragraph("Implementation & File Location", tbl_header), Paragraph("Engineering Rationale", tbl_header)]
    cs_rows = [
        [
            Paragraph("<b>Directed Acyclic Graph (DAG)</b>", tbl_cell),
            Paragraph("<code>app/strata/</code><br/><code>lib/strata-engine.ts</code>", code_cell),
            Paragraph("Models prerequisite concept dependencies. Prevents circular knowledge references and guarantees topological ordering of remediation probes.", tbl_cell)
        ],
        [
            Paragraph("<b>Strategy Pattern Drivers</b>", tbl_cell),
            Paragraph("<code>lib/compiler/drivers/</code><br/>(python, node, cpp, java, rust)", code_cell),
            Paragraph("Decouples individual language compilation and execution lifecycles into interchangeable polymorphic drivers sharing a unified sandbox interface.", tbl_cell)
        ],
        [
            Paragraph("<b>O(1) Doubly-Linked LRU Cache</b>", tbl_cell),
            Paragraph("<code>lib/compiler/cache.ts</code><br/><code>DoublyLinkedListNode&lt;T&gt;</code>", code_cell),
            Paragraph("Eliminates redundant child process spawning by hashing source code + stdin via SHA-256. Access, insert, and eviction operate in strict O(1) time (&lt;1ms).", tbl_cell)
        ],
        [
            Paragraph("<b>AST-Aware Line Splicing</b>", tbl_cell),
            Paragraph("<code>lib/ai/doctor.ts</code><br/><code>app/terminal/page.tsx</code>", code_cell),
            Paragraph("Computes unified line diffs (L_start to L_end) to replace only corrupted code lines in the editor buffer, preserving intact student work.", tbl_cell)
        ],
        [
            Paragraph("<b>Bayesian Distractor Probing</b>", tbl_cell),
            Paragraph("<code>lib/diagnostic/probes.ts</code>", code_cell),
            Paragraph("Multiple-choice probe options contain scientifically calibrated distractors mapped to specific misconceptions, updating student mastery probability.", tbl_cell)
        ],
    ]
    t_cs = Table([cs_headers] + cs_rows, colWidths=[125, 145, 238])
    t_cs.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HexColor('#0f172a')),
        ('BOX', (0, 0), (-1, -1), 1, HexColor('#cbd5e1')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, HexColor('#e2e8f0')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, HexColor('#f8fafc')]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(t_cs)
    story.append(Spacer(1, 10))

    story.append(Paragraph("Algorithmic Misconception & Fault Classification Matrix", section_h2))
    story.append(Spacer(1, 5))

    matrix_headers = [
        Paragraph("Misconception Class", tbl_header),
        Paragraph("Theoretical Underpinning", tbl_header),
        Paragraph("Typical Manifestation", tbl_header),
        Paragraph("Faultline Remediation", tbl_header)
    ]
    matrix_rows = [
        [
            Paragraph("<b>Pointer Drift</b>", tbl_cell_bold),
            Paragraph("Confusion between reference binding and value copying", tbl_cell),
            Paragraph("Mutating cloned graph node unintentionally mutates original state", tbl_cell),
            Paragraph("Memory reference visualization & probe on object identity", tbl_cell)
        ],
        [
            Paragraph("<b>Invariant Drift</b>", tbl_cell_bold),
            Paragraph("Imprecise boundary condition in iterative search loops", tbl_cell),
            Paragraph("<code>while (left &lt; right)</code> terminates prematurely on single elements", code_cell),
            Paragraph("Surgical Doctor isolates loop conditional; highlights invariant", tbl_cell)
        ],
        [
            Paragraph("<b>Halving Overflow</b>", tbl_cell_bold),
            Paragraph("Integer register overflow during midpoint arithmetic", tbl_cell),
            Paragraph("<code>(low + high) / 2</code> overflows signed 32-bit integer limits", code_cell),
            Paragraph("Codex mental shift: <code>low + ((high-low)&gt;&gt;1)</code> formula", tbl_cell)
        ],
        [
            Paragraph("<b>DP State Mutation</b>", tbl_cell_bold),
            Paragraph("Shared mutable data structures inside recursion memoization", tbl_cell),
            Paragraph("Memo table returns corrupt subproblem solutions across branches", tbl_cell),
            Paragraph("AST analysis flags reference reuse in memoization tables", tbl_cell)
        ],
        [
            Paragraph("<b>Base-Case Collapse</b>", tbl_cell_bold),
            Paragraph("Non-convergent recursive decomposition", tbl_cell),
            Paragraph("Missing termination condition; stack overflow exception", tbl_cell),
            Paragraph("Call-stack tracing isolates non-convergent subproblem call", tbl_cell)
        ]
    ]
    t_matrix = Table([matrix_headers] + matrix_rows, colWidths=[90, 135, 155, 128])
    t_matrix.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HexColor('#7c3aed')),
        ('BOX', (0, 0), (-1, -1), 1, HexColor('#cbd5e1')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, HexColor('#e2e8f0')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, HexColor('#faf5ff')]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(t_matrix)
    story.append(PageBreak())

    # =========================================================================
    # HELPER FOR FEATURE PAGES 3 TO 7
    # =========================================================================
    def add_feature_page(title, img_filename, quote_title, quote_text, why_needed, workflow_steps):
        story.append(Paragraph(title, section_h1))
        story.append(Spacer(1, 2))

        # Accent horizontal line below title
        t_line = Table([[""]], colWidths=[508], rowHeights=[1.5])
        t_line.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), HexColor('#7c3aed'))]))
        story.append(t_line)
        story.append(Spacer(1, 7))

        # Single wide screenshot (508 x 212 pt)
        img_path = os.path.join(SHOWCASE_DIR, img_filename)
        if os.path.exists(img_path):
            img_table = Table([[Image(img_path, width=508, height=212)]], colWidths=[508])
            img_table.setStyle(TableStyle([
                ('BOX', (0, 0), (-1, -1), 1, HexColor('#cbd5e1')),
                ('TOPPADDING', (0, 0), (-1, -1), 0),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
                ('LEFTPADDING', (0, 0), (-1, -1), 0),
                ('RIGHTPADDING', (0, 0), (-1, -1), 0),
            ]))
            story.append(img_table)
        story.append(Spacer(1, 7))

        # Feature quote box
        story.append(create_quote_box(quote_title, quote_text))
        story.append(Spacer(1, 8))

        # Why it is needed
        story.append(Paragraph("Why It Is Needed:", section_h2))
        story.append(Spacer(1, 3))
        story.append(Paragraph(why_needed, body_p))
        story.append(Spacer(1, 7))

        # Operational procedures & workflow
        story.append(Paragraph("Operational Procedures & Workflow:", section_h2))
        story.append(Spacer(1, 3))
        for idx, step in enumerate(workflow_steps):
            story.append(Paragraph(f"{idx+1}. {step}", bullet_p))
            story.append(Spacer(1, 2))

        story.append(PageBreak())

    # =========================================================================
    # PAGE 3: PART I.1 - DYNAMIC LANDING & SHOWCASE GALLERY
    # =========================================================================
    add_feature_page(
        title="Part I.1: Dynamic Landing & Cognitive Showcase Gallery",
        img_filename="landing-showcase-gallery.png",
        quote_title="Adaptive Cognitive Architecture — V.A. Sai Venkatesh (Lead Architect)",
        quote_text="The Faultline landing interface serves as a live visual manifest of our platform's cognitive capabilities. Designed with modern obsidian glassmorphism, responsive 3D emblem rendering, and seamless day/night theme switching, it instantly communicates the rigor of our geological pedagogy to students, educators, and enterprise engineering leads.",
        why_needed="Educational platforms frequently fail due to uninspiring user interfaces that obscure their underlying technological depth. The Faultline landing architecture provides immediate visual and technical onboarding: featuring an interactive 3D crystal emblem, a Bento grid of core pillars, a 5-step cognitive pipeline, and instant access to native terminals.",
        workflow_steps=[
            "Launch Interface: Access https://faultline.vercel.app to load the command center with hardware-accelerated theme synchronization.",
            "Interactive Showcase: Click through the 13 preview tabs in the Showcase Gallery to inspect active snapshots of Strata, Terminal, Doctor, and Codex views.",
            "Inspect Pillars & Pipeline: Review the 4-Pillar Bento Grid and 5-Step Remediation Pipeline to understand the pedagogical lifecycle.",
            "Direct Subsystem Routing: Click 'Launch Live Terminal' or 'Explore Cognitive Strata' to enter live debugging sessions."
        ]
    )

    # =========================================================================
    # PAGE 4: PART I.2 - GEOLOGICAL COGNITIVE STRATA DAG
    # =========================================================================
    add_feature_page(
        title="Part I.2: Geological Cognitive Strata & Diagnostic Engine",
        img_filename="strata-bst-dark.png",
        quote_title="Geological Concept Prerequisite Strata — V.A. Sai Venkatesh (Lead Architect)",
        quote_text="Knowledge is not a flat checklist—it is geological. Fundamental concepts like Memory Allocation and Pointer Semantics form the Bedrock upon which Binary Search Trees and Dynamic Programming rest. Faultline’s DAG visualizes this structural integrity in real time, detecting micro-fractures before they trigger systemic comprehension collapse.",
        why_needed="When a learner fails an algorithmic challenge, standard platforms cannot determine if the failure was caused by high-level design or a broken foundation. Faultline traverses a 4-level geological DAG (Bedrock, Tectonic, Faultline, Surface). When a fault is detected, targeted diagnostic probes isolate the exact cognitive distractor.",
        workflow_steps=[
            "Navigate Strata: Visit /strata to explore the dynamic concept graph. Select between BST, Graph Theory, and Dynamic Programming.",
            "Node Inspection: Nodes display live states: Stabilized (Green), Faultline Diagnosed (Red), or Stabilizing (Amber).",
            "Trigger Diagnostic Probe: Click any fractured node to open the probe interface containing calibrated distractor choices.",
            "Evaluate Knowledge State: Correct submissions stabilize the node (+15% mastery); distractor selections surface targeted remediation advice."
        ]
    )

    # =========================================================================
    # PAGE 5: PART I.3 - NATIVE SANDBOXED TERMINAL & STDIN
    # =========================================================================
    add_feature_page(
        title="Part I.3: Native Sandboxed Terminal & Interactive Stdin",
        img_filename="terminal-stdin-dark.png",
        quote_title="Genuine Sandbox Toolchains & Stdin Streaming — V.A. Sai Venkatesh (Lead Architect)",
        quote_text="Engineering integrity demands genuine execution. Faultline completely rejects fake, hardcoded compiler mocks. Every line of Python, JavaScript, C++, Java, or Rust authored in our editor is compiled and executed in a local sandboxed child process with real standard input streaming and sub-millisecond caching.",
        why_needed="Most browser-based coding tools simulate output through hardcoded strings. Faultline installs genuine child process wrappers around host compilers. It supports interactive input(), cin >>, and Scanner, while protecting system resources through sandboxed execution timeouts and memory caps.",
        workflow_steps=[
            "Select Language: Navigate to /terminal and pick from Python 3.13, Node.js 20, GCC C++, Java 21, or Rust 1.78.",
            "Code Composition: Write code in the Monaco/CodeMirror editor or load pre-built algorithmic templates.",
            "Interactive Stdin: If the program asks for input, enter values in the interactive prompt and stream them to the child process.",
            "Execution Telemetry: Click 'Run Code' (Ctrl+Enter) to inspect stdout, stderr, exit code, and runtime. Identical code hits the LRU cache in <1ms."
        ]
    )

    # =========================================================================
    # PAGE 6: PART I.4 - SURGICAL AI CODE DOCTOR
    # =========================================================================
    add_feature_page(
        title="Part I.4: Surgical AI Code Doctor & In-Memory AST Line Splicing",
        img_filename="doctor-surgical-diff-dark.png",
        quote_title="Vascular AST Line-Targeted Repair — V.A. Sai Venkatesh (Lead Architect)",
        quote_text="When a student's code contains an error, generative AI often destroys the learning process by wiping out the entire script and replacing it with generic boilerplate. The Faultline AI Doctor acts like a vascular surgeon: it pinpoints the exact line numbers responsible for the cognitive error, displays a surgical unified diff, and splices only the necessary lines in-memory while preserving the author's structure.",
        why_needed="Standard LLM assistants rewrite the entire program from scratch, preventing students from understanding where their conceptual model failed. Faultline’s AI Doctor uses Gemini 3.5 Lite to isolate the exact line numbers responsible for the error and renders an interactive unified diff with pedagogical explanations.",
        workflow_steps=[
            "Trigger Diagnosis: Following any compiler error or runtime exception in /terminal, click 'Diagnose with AI Doctor'.",
            "Inspect Unified Diff: Review the line-by-line diff highlighting deletions in red and additions in green with exact line numbers.",
            "Analyze Conceptual Shift: Read the accompanying cognitive explanation detailing why the original logic caused the fault.",
            "Apply In-Memory Fix: Click 'Apply Surgical Fix' to splice the correction directly into the active editor buffer without replacing untouched lines."
        ]
    )

    # =========================================================================
    # PAGE 7: PART I.5 - MISCONCEPTION CODEX
    # =========================================================================
    add_feature_page(
        title="Part I.5: The Misconception Codex & Architectural Mental Shifts",
        img_filename="codex-cards-dark.png",
        quote_title="Cognitive Trap to Mental Shift Transformation — V.A. Sai Venkatesh (Lead Architect)",
        quote_text="Every master engineer was once trapped by the same algorithmic illusions. The Misconception Codex is our living encyclopedia of cognitive traps. By cataloging the exact friction points between intuitive human thinking and rigorous machine execution, we turn recurring bugs into permanent conceptual breakthroughs.",
        why_needed="Students often memorize code snippets without understanding underlying failure modes. The Misconception Codex serves as an architectural encyclopedia that categorizes recurring mental traps (off-by-one errors, recursion base-case collapse, reference mutations) and pairs them with transformative mental shifts.",
        workflow_steps=[
            "Browse Encyclopedia: Navigate to /codex and filter entries by category (Arrays, Binary Search, Trees, DP, Graphs).",
            "Examine Cognitive Trap: Open any entry to inspect the intuitive misconception that causes students to implement flawed algorithms.",
            "Adopt Mental Shift: Study the visual breakdown and code comparison illustrating the correct invariant.",
            "Direct Terminal Practice: Click 'Practice in Terminal' to load a calibrated exercise testing mastery of the corrected concept."
        ]
    )

    # =========================================================================
    # PAGE 8: PART II - REST API SPECIFICATION
    # =========================================================================
    story.append(Paragraph("Part II: Complete REST API Specification", section_h1))
    story.append(Spacer(1, 2))
    t_line2 = Table([[""]], colWidths=[508], rowHeights=[1.5])
    t_line2.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), HexColor('#7c3aed'))]))
    story.append(t_line2)
    story.append(Spacer(1, 8))

    story.append(Paragraph("Core Production Endpoints", section_h2))
    story.append(Spacer(1, 4))

    api_headers = [Paragraph("Method & Path", tbl_header), Paragraph("Subsystem", tbl_header), Paragraph("Description & Operation", tbl_header)]
    api_rows = [
        [
            Paragraph("<b>POST /api/compile</b>", tbl_cell_bold),
            Paragraph("Sandbox Compiler", tbl_cell),
            Paragraph("Executes code in native child process with interactive stdin streaming and sub-millisecond LRU execution caching.", tbl_cell)
        ],
        [
            Paragraph("<b>POST /api/diagnose-code</b>", tbl_cell_bold),
            Paragraph("AI Code Doctor", tbl_cell),
            Paragraph("Gemini 3.5 Lite AST inspection; returns targeted line diff and misconception explanation without whole-code wipe.", tbl_cell)
        ],
        [
            Paragraph("<b>POST /api/remediate</b>", tbl_cell_bold),
            Paragraph("Adaptive Engine", tbl_cell),
            Paragraph("Evaluates probe answers, updates Bayesian student mastery score, and stabilizes DAG concept nodes.", tbl_cell)
        ],
        [
            Paragraph("<b>GET /api/concept-tree</b>", tbl_cell_bold),
            Paragraph("Strata DAG", tbl_cell),
            Paragraph("Retrieves the complete geological concept DAG with prerequisite links, node health, and mastery metrics.", tbl_cell)
        ],
        [
            Paragraph("<b>GET /api/codex</b>", tbl_cell_bold),
            Paragraph("Misconception Codex", tbl_cell),
            Paragraph("Returns catalog of cognitive traps, theoretical root causes, and corrective mental shifts.", tbl_cell)
        ],
        [
            Paragraph("<b>GET /api/health</b>", tbl_cell_bold),
            Paragraph("System & Health", tbl_cell),
            Paragraph("Deployment readiness probe for Cloud Run, Kubernetes, and Hugging Face Spaces. Returns <code>{\"status\": \"ok\"}</code>.", tbl_cell)
        ],
    ]
    t_api = Table([api_headers] + api_rows, colWidths=[130, 105, 273])
    t_api.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HexColor('#0f172a')),
        ('BOX', (0, 0), (-1, -1), 1, HexColor('#cbd5e1')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, HexColor('#e2e8f0')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, HexColor('#f8fafc')]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(t_api)
    story.append(Spacer(1, 10))

    story.append(Paragraph("HTTP Status Code & Resilience Dictionary", section_h2))
    story.append(Spacer(1, 4))

    status_headers = [Paragraph("Status Code", tbl_header), Paragraph("Condition & Cause", tbl_header), Paragraph("Platform Resolution & Handling", tbl_header)]
    status_rows = [
        [
            Paragraph("<b>200 OK</b>", tbl_cell_bold),
            Paragraph("Successful compilation, diagnosis, or data retrieval", tbl_cell),
            Paragraph("Returns structured JSON payload with execution telemetry and cache headers.", tbl_cell)
        ],
        [
            Paragraph("<b>400 Bad Request</b>", tbl_cell_bold),
            Paragraph("Missing required parameters (e.g. missing code or malformed UUID)", tbl_cell),
            Paragraph("FastAPI/Next.js returns schema validation error with descriptive message.", tbl_cell)
        ],
        [
            Paragraph("<b>422 Unprocessable</b>", tbl_cell_bold),
            Paragraph("Unsupported compiler language or payload exceeds memory/time thresholds", tbl_cell),
            Paragraph("Rejects request with allowed compiler matrix and resource boundary limits.", tbl_cell)
        ],
        [
            Paragraph("<b>500 Server Error</b>", tbl_cell_bold),
            Paragraph("Subprocess crash or missing GEMINI_API_KEY", tbl_cell),
            Paragraph("Surfaces clear error message instructing operator to verify environment.", tbl_cell)
        ],
        [
            Paragraph("<b>503 Unavailable</b>", tbl_cell_bold),
            Paragraph("Compiler toolchain missing on host system or database timeout", tbl_cell),
            Paragraph("System gracefully falls back to cached fixtures or prompts operator installation.", tbl_cell)
        ]
    ]
    t_status = Table([status_headers] + status_rows, colWidths=[90, 150, 268])
    t_status.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HexColor('#0891b2')),
        ('BOX', (0, 0), (-1, -1), 1, HexColor('#cbd5e1')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, HexColor('#e2e8f0')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, HexColor('#f0fdf4')]),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(t_status)
    story.append(PageBreak())

    # =========================================================================
    # PAGE 9: PART III - DATA ARCHITECTURE & DEPLOYMENT
    # =========================================================================
    story.append(Paragraph("Part III: Cloud Data Architecture & Deployment", section_h1))
    story.append(Spacer(1, 2))
    t_line3 = Table([[""]], colWidths=[508], rowHeights=[1.5])
    t_line3.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), HexColor('#7c3aed'))]))
    story.append(t_line3)
    story.append(Spacer(1, 8))

    story.append(Paragraph("Prisma Schema: Core Knowledge & Execution Models", section_h2))
    story.append(Spacer(1, 4))

    db_headers = [Paragraph("Field / Model Name", tbl_header), Paragraph("Data Type", tbl_header), Paragraph("Description & Canonical Role", tbl_header), Paragraph("Indexing Rule", tbl_header)]
    db_rows = [
        [
            Paragraph("<code>ConceptTree</code>", code_cell),
            Paragraph("Model", tbl_cell),
            Paragraph("Represents geological strata layers (1: Bedrock, 2: Tectonic, 3: Faultline, 4: Surface)", tbl_cell),
            Paragraph("Primary key id, unique slug", tbl_cell)
        ],
        [
            Paragraph("<code>ConceptNode</code>", code_cell),
            Paragraph("Model", tbl_cell),
            Paragraph("Individual algorithmic concept nodes in the DAG with status tracking (STABILIZED, DIAGNOSED)", tbl_cell),
            Paragraph("Indexed on treeId", tbl_cell)
        ],
        [
            Paragraph("<code>DiagnosticQuestion</code>", code_cell),
            Paragraph("Model", tbl_cell),
            Paragraph("Adaptive probe questions linked to parent concept nodes for distractor analysis", tbl_cell),
            Paragraph("Indexed on nodeId", tbl_cell)
        ],
        [
            Paragraph("<code>Distractor</code>", code_cell),
            Paragraph("Model", tbl_cell),
            Paragraph("Multiple-choice options mapped to specific cognitive misconceptions in Codex", tbl_cell),
            Paragraph("Indexed on questionId", tbl_cell)
        ],
        [
            Paragraph("<code>ExecutionCache</code>", code_cell),
            Paragraph("Model / Cache", tbl_cell),
            Paragraph("SHA-256 digested code + stdin payloads for sub-millisecond cached responses", tbl_cell),
            Paragraph("O(1) in-memory LRU key", tbl_cell)
        ],
    ]
    t_db = Table([db_headers] + db_rows, colWidths=[105, 75, 208, 120])
    t_db.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), HexColor('#059669')),
        ('BOX', (0, 0), (-1, -1), 1, HexColor('#cbd5e1')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, HexColor('#e2e8f0')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, HexColor('#f0fdf4')]),
        ('TOPPADDING', (0, 0), (-1, -1), 3.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
    ]))
    story.append(t_db)
    story.append(Spacer(1, 8))

    story.append(Paragraph("Dual Production Deployment Architecture", section_h2))
    story.append(Spacer(1, 3))

    deploy_text = (
        "<b>Option A — Google Cloud Run / Edge Serverless:</b><br/>"
        "• Containerized via multi-stage Dockerfile based on <code>node:20-slim</code> with pre-installed GCC, Python 3.13, and Java.<br/>"
        "• Dynamically binds to the <code>$PORT</code> environment variable required by Cloud Run or Vercel.<br/>"
        "• API keys (<code>GEMINI_API_KEY</code>, <code>DATABASE_URL</code>) mounted securely via Cloud Run Secrets.<br/>"
        "• Runs 100% within Google Cloud and Neon Free Tier limits ($0 monthly operational cost).<br/><br/>"
        "<b>Option B — Hugging Face Spaces (Zero-Card Docker Space):</b><br/>"
        "• Direct Git push to Hugging Face Spaces Docker runtime with no billing card verification required.<br/>"
        "• Respects default port 7860 with secrets configured via Space Settings.<br/><br/>"
        "<b>Frontend CDN Deployment (Vercel / GitHub Pages):</b><br/>"
        "• Zero-configuration edge hosting via <code>vercel.json</code> with global sub-50ms latency."
    )
    story.append(Paragraph(deploy_text, body_p))
    story.append(Spacer(1, 8))

    # Architectural Sign-off Box
    signoff_text = (
        "Faultline represents a complete, deterministic engineering solution for computer science pedagogy. "
        "By fusing Google Gemini 3.5 reasoning, geological cognitive DAG modeling, native multi-language sandboxed execution, "
        "and surgical AST line splicing, the platform safeguards conceptual integrity and turns compiler failures into permanent breakthroughs."
    )
    story.append(create_quote_box(
        "ARCHITECTURAL SIGN-OFF — V.A. Sai Venkatesh (Lead Architect)",
        signoff_text,
        border_color="#f59e0b",
        bg_color="#fffbeb",
        title_color="#b45309",
        text_color="#78350f"
    ))

    # Build the document
    doc.build(story, canvasmaker=NumberedCanvas)

    print(f"Generated PDF in docs/: {PDF_OUT_DOCS} ({os.path.getsize(PDF_OUT_DOCS)} bytes)")

    # Copy to public/ for web serving
    with open(PDF_OUT_DOCS, "rb") as src, open(PDF_OUT_PUBLIC, "wb") as dst:
        dst.write(src.read())
    print(f"Copied PDF to public/: {PDF_OUT_PUBLIC}")


if __name__ == "__main__":
    build_pdf()
