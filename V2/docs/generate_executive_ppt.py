"""Generate 3-slide executive PPT for Improvement Maintenance (Mixing)."""
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN
from pptx.enum.shapes import MSO_SHAPE
from pathlib import Path

NAVY = RGBColor(0x0F, 0x2A, 0x43)
TEAL = RGBColor(0x1F, 0x6F, 0x78)
ACCENT = RGBColor(0xC4, 0x5C, 0x26)
LIGHT = RGBColor(0xF5, 0xF7, 0xF8)
WHITE = RGBColor(0xFF, 0xFF, 0xFF)
MUTED = RGBColor(0x5B, 0x6B, 0x7A)
DARK = RGBColor(0x1A, 0x1A, 0x1A)
LINE = RGBColor(0xD0, 0xD7, 0xDE)
SOFT = RGBColor(0xC8, 0xD4, 0xDC)


def set_run(run, size=18, bold=False, color=DARK, font="Calibri"):
    run.font.name = font
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.color.rgb = color


def add_rect(slide, left, top, width, height, fill, line=None):
    shape = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, left, top, width, height)
    shape.fill.solid()
    shape.fill.fore_color.rgb = fill
    if line is None:
        shape.line.fill.background()
    else:
        shape.line.color.rgb = line
    return shape


def add_textbox(
    slide,
    left,
    top,
    width,
    height,
    text,
    size=18,
    bold=False,
    color=DARK,
    align=PP_ALIGN.LEFT,
):
    box = slide.shapes.add_textbox(left, top, width, height)
    tf = box.text_frame
    tf.word_wrap = True
    p = tf.paragraphs[0]
    p.alignment = align
    run = p.add_run()
    run.text = text
    set_run(run, size=size, bold=bold, color=color)
    return box


def add_bullets(slide, left, top, width, height, items, size=16, color=DARK, spacing=8):
    box = slide.shapes.add_textbox(left, top, width, height)
    tf = box.text_frame
    tf.word_wrap = True
    for i, item in enumerate(items):
        p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
        p.alignment = PP_ALIGN.LEFT
        p.space_after = Pt(spacing)
        run = p.add_run()
        run.text = "•  " + item
        set_run(run, size=size, bold=False, color=color)
    return box


def footer(slide, page, total=3):
    add_textbox(
        slide,
        Inches(0.6),
        Inches(7.05),
        Inches(10),
        Inches(0.3),
        "Improvement Maintenance  |  Mixing Digitalization  |  Nov 2025 – Present",
        size=11,
        color=MUTED,
    )
    add_textbox(
        slide,
        Inches(11.8),
        Inches(7.05),
        Inches(1),
        Inches(0.3),
        f"{page}/{total}",
        size=11,
        color=MUTED,
        align=PP_ALIGN.RIGHT,
    )


def build():
    prs = Presentation()
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)

    # ----- Slide 1: Title / Context -----
    s1 = prs.slides.add_slide(prs.slide_layouts[6])
    add_rect(s1, Inches(0), Inches(0), Inches(13.333), Inches(7.5), LIGHT)
    add_rect(s1, Inches(0), Inches(0), Inches(0.18), Inches(7.5), TEAL)
    add_rect(s1, Inches(0), Inches(0), Inches(13.333), Inches(0.12), NAVY)

    add_textbox(
        s1, Inches(0.7), Inches(1.6), Inches(12), Inches(0.4),
        "EXECUTIVE BRIEF", size=14, bold=True, color=ACCENT,
    )
    add_textbox(
        s1, Inches(0.7), Inches(2.05), Inches(12), Inches(0.8),
        "Improvement Maintenance", size=40, bold=True, color=NAVY,
    )
    add_textbox(
        s1, Inches(0.7), Inches(2.85), Inches(12), Inches(0.5),
        "Digitalization of Manufacturing Process (Mixing)", size=22, color=TEAL,
    )
    add_rect(s1, Inches(0.7), Inches(3.55), Inches(2.2), Inches(0.06), ACCENT)

    card_y = Inches(4.0)
    card_h = Inches(1.6)
    card_w = Inches(3.8)
    gap = Inches(0.35)
    cards = [
        ("TIMELINE", "November 2025 – Present"),
        ("TARGET", "Wangsanic  ·  KMI  ·  Dose Magna Reka"),
        ("FOCUS", "Continuous improvement of mixing\noperations via internal development"),
    ]
    for i, (label, value) in enumerate(cards):
        x = Inches(0.7) + i * (card_w + gap)
        add_rect(s1, x, card_y, card_w, card_h, WHITE, LINE)
        add_rect(s1, x, card_y, card_w, Inches(0.08), TEAL)
        add_textbox(
            s1, x + Inches(0.25), card_y + Inches(0.25),
            card_w - Inches(0.4), Inches(0.3),
            label, size=12, bold=True, color=ACCENT,
        )
        add_textbox(
            s1, x + Inches(0.25), card_y + Inches(0.6),
            card_w - Inches(0.4), Inches(0.8),
            value, size=15, color=NAVY,
        )
    footer(s1, 1)

    # ----- Slide 2: Before → Outcome -----
    s2 = prs.slides.add_slide(prs.slide_layouts[6])
    add_rect(s2, Inches(0), Inches(0), Inches(13.333), Inches(7.5), LIGHT)
    add_rect(s2, Inches(0), Inches(0), Inches(0.18), Inches(7.5), TEAL)
    add_rect(s2, Inches(0), Inches(0), Inches(13.333), Inches(0.12), NAVY)

    add_textbox(
        s2, Inches(0.7), Inches(0.35), Inches(12), Inches(0.4),
        "BEFORE  →  OUTCOME", size=14, bold=True, color=ACCENT,
    )
    add_textbox(
        s2, Inches(0.7), Inches(0.7), Inches(12), Inches(0.5),
        "From constraints to operational fit", size=28, bold=True, color=NAVY,
    )

    add_rect(s2, Inches(0.7), Inches(1.5), Inches(5.7), Inches(4.9), WHITE, LINE)
    add_rect(s2, Inches(0.7), Inches(1.5), Inches(5.7), Inches(0.55), NAVY)
    add_textbox(
        s2, Inches(0.95), Inches(1.58), Inches(5.2), Inches(0.4),
        "BEFORE", size=16, bold=True, color=WHITE,
    )
    add_bullets(
        s2, Inches(1.0), Inches(2.3), Inches(5.1), Inches(3.8),
        [
            "High cost to procure new instruments",
            "No structured continuous improvement",
            "Long lead time for process changes",
        ],
        size=18, spacing=18,
    )

    add_rect(s2, Inches(6.9), Inches(1.5), Inches(5.7), Inches(4.9), WHITE, LINE)
    add_rect(s2, Inches(6.9), Inches(1.5), Inches(5.7), Inches(0.55), TEAL)
    add_textbox(
        s2, Inches(7.15), Inches(1.58), Inches(5.2), Inches(0.4),
        "OUTCOME", size=16, bold=True, color=WHITE,
    )
    add_bullets(
        s2, Inches(7.2), Inches(2.3), Inches(5.1), Inches(3.8),
        [
            "Refined features that fit real user needs",
            "Rigid documentation & standardized reports",
            "Faster iteration through internal delivery",
        ],
        size=18, spacing=18,
    )
    footer(s2, 2)

    # ----- Slide 3: Impact + Next -----
    s3 = prs.slides.add_slide(prs.slide_layouts[6])
    add_rect(s3, Inches(0), Inches(0), Inches(13.333), Inches(7.5), LIGHT)
    add_rect(s3, Inches(0), Inches(0), Inches(0.18), Inches(7.5), TEAL)
    add_rect(s3, Inches(0), Inches(0), Inches(13.333), Inches(0.12), NAVY)

    add_textbox(
        s3, Inches(0.7), Inches(0.35), Inches(12), Inches(0.4),
        "IMPACT  &  NEXT", size=14, bold=True, color=ACCENT,
    )
    add_textbox(
        s3, Inches(0.7), Inches(0.7), Inches(12), Inches(0.5),
        "Value delivered and roadmap ahead", size=28, bold=True, color=NAVY,
    )

    impacts = [
        ("USER ACCESS", "User-friendly accessibility\nfor operators & supervisors"),
        ("COST EFFICIENCY", "Lower development cost via\ninternal build & maintenance"),
    ]
    for i, (title, body) in enumerate(impacts):
        x = Inches(0.7) + i * Inches(6.1)
        add_rect(s3, x, Inches(1.5), Inches(5.8), Inches(2.4), WHITE, LINE)
        add_rect(s3, x, Inches(1.5), Inches(0.12), Inches(2.4), TEAL)
        add_textbox(
            s3, x + Inches(0.4), Inches(1.75), Inches(5.1), Inches(0.4),
            title, size=14, bold=True, color=ACCENT,
        )
        add_textbox(
            s3, x + Inches(0.4), Inches(2.3), Inches(5.1), Inches(1.2),
            body, size=20, bold=True, color=NAVY,
        )

    add_rect(s3, Inches(0.7), Inches(4.3), Inches(11.9), Inches(2.1), NAVY)
    add_textbox(
        s3, Inches(1.0), Inches(4.55), Inches(11.3), Inches(0.35),
        "NEXT IMPROVEMENT", size=13, bold=True, color=ACCENT,
    )
    add_textbox(
        s3, Inches(1.0), Inches(5.0), Inches(11.3), Inches(0.5),
        "GMP-level implementation", size=26, bold=True, color=WHITE,
    )
    add_textbox(
        s3, Inches(1.0), Inches(5.55), Inches(11.3), Inches(0.5),
        "Stronger compliance readiness, process control, and end-to-end traceability.",
        size=16, color=SOFT,
    )
    footer(s3, 3)

    out = Path(__file__).with_name(
        "Improvement_Maintenance_Mixing_Executive_3Slides.pptx"
    )
    prs.save(out)
    print(out)


if __name__ == "__main__":
    build()
