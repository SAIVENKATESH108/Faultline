"""
Faultline Complete Engineering Specification & System Documentation Builder
Delegates to generate_reportlab_pdf.py to produce the publication-grade 9-page PDF.
"""

import os
import subprocess
import sys

WORKSPACE_DIR = r"d:\Freshstart\Promethius-hackthon"
SCRIPT_PATH = os.path.join(WORKSPACE_DIR, "docs", "generate_reportlab_pdf.py")

if __name__ == "__main__":
    print(f"Building Faultline System Documentation via ReportLab: {SCRIPT_PATH}")
    result = subprocess.run([sys.executable, SCRIPT_PATH], check=True)
    sys.exit(result.returncode)
