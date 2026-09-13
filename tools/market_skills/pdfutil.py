"""Minimal markdown → PDF for DGS AI reports (reportlab)."""
from __future__ import annotations

import re
from pathlib import Path

from reportlab.lib.pagesizes import LETTER
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Preformatted


def md_to_pdf(md_text: str, pdf_path: str | Path) -> str:
    pdf_path = Path(pdf_path)
    pdf_path.parent.mkdir(parents=True, exist_ok=True)
    styles = getSampleStyleSheet()
    h1 = ParagraphStyle("DgsH1", parent=styles["Heading1"], fontSize=16, spaceAfter=10)
    h2 = ParagraphStyle("DgsH2", parent=styles["Heading2"], fontSize=13, spaceAfter=8)
    body = ParagraphStyle("DgsBody", parent=styles["BodyText"], fontSize=10, leading=14, spaceAfter=6)
    mono = ParagraphStyle("DgsMono", parent=styles["Code"], fontSize=8, leading=10)

    doc = SimpleDocTemplate(
        str(pdf_path),
        pagesize=LETTER,
        leftMargin=0.75 * inch,
        rightMargin=0.75 * inch,
        topMargin=0.75 * inch,
        bottomMargin=0.75 * inch,
    )
    story = []
    for raw in md_text.splitlines():
        line = raw.rstrip()
        if not line.strip():
            story.append(Spacer(1, 6))
            continue
        if line.startswith("# "):
            story.append(Paragraph(_esc(line[2:]), h1))
        elif line.startswith("## "):
            story.append(Paragraph(_esc(line[3:]), h2))
        elif line.startswith("### "):
            story.append(Paragraph(_esc(line[4:]), h2))
        elif line.startswith("```"):
            continue
        elif line.startswith("|") or line.startswith("- ") or line.startswith("* "):
            story.append(Preformatted(_plain(line), mono))
        else:
            story.append(Paragraph(_esc(line), body))
    story.append(Spacer(1, 12))
    story.append(
        Paragraph(
            _esc(
                "DGS AI · Not financial advice · Delayed data possible · No guaranteed profits"
            ),
            body,
        )
    )
    doc.build(story)
    return str(pdf_path)


def _esc(s: str) -> str:
    s = s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    s = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", s)
    s = re.sub(r"`([^`]+)`", r"<font face='Courier'>\1</font>", s)
    return s


def _plain(s: str) -> str:
    return s.replace("\t", "    ")
