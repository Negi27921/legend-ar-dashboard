#!/usr/bin/env python3
"""Generate Legend AR Command Center — System Flow PDF for non-technical audience."""

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor, white, black
from reportlab.pdfgen import canvas
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

W, H = A4  # 210mm x 297mm

# Brand colors
PRIMARY = HexColor("#1E2033")
SECONDARY = HexColor("#212191")
ACCENT = HexColor("#E8EFFC")
BG = HexColor("#FAFAFA")
EMERALD = HexColor("#10B981")
AMBER = HexColor("#F59E0B")
RED = HexColor("#EF4444")
BLUE = HexColor("#3B82F6")
VIOLET = HexColor("#8B5CF6")
GRAY = HexColor("#6B7280")
LIGHT_GRAY = HexColor("#F3F4F6")
DARK_GRAY = HexColor("#374151")
TEAL = HexColor("#14B8A6")

def draw_rounded_rect(c, x, y, w, h, r=4*mm, fill=None, stroke=None, stroke_width=0.5):
    """Draw a rounded rectangle."""
    c.saveState()
    if fill:
        c.setFillColor(fill)
    if stroke:
        c.setStrokeColor(stroke)
        c.setLineWidth(stroke_width)
    p = c.beginPath()
    p.roundRect(x, y, w, h, r)
    if fill and stroke:
        c.drawPath(p, fill=1, stroke=1)
    elif fill:
        c.drawPath(p, fill=1, stroke=0)
    elif stroke:
        c.drawPath(p, fill=0, stroke=1)
    c.restoreState()

def draw_arrow(c, x1, y1, x2, y2, color=GRAY, width=1.5, head_size=3*mm):
    """Draw an arrow from (x1,y1) to (x2,y2)."""
    import math
    c.saveState()
    c.setStrokeColor(color)
    c.setFillColor(color)
    c.setLineWidth(width)
    c.line(x1, y1, x2, y2)
    # Arrowhead
    angle = math.atan2(y2 - y1, x2 - x1)
    p = c.beginPath()
    p.moveTo(x2, y2)
    p.lineTo(x2 - head_size * math.cos(angle - 0.4), y2 - head_size * math.sin(angle - 0.4))
    p.lineTo(x2 - head_size * math.cos(angle + 0.4), y2 - head_size * math.sin(angle + 0.4))
    p.close()
    c.drawPath(p, fill=1, stroke=0)
    c.restoreState()

def draw_box_with_icon(c, x, y, w, h, title, subtitle, icon_text, bg_color, icon_bg, text_color=white):
    """Draw a labeled box with an icon circle."""
    draw_rounded_rect(c, x, y, w, h, r=5*mm, fill=bg_color, stroke=HexColor("#E5E7EB"), stroke_width=0.5)
    # Icon circle
    icon_r = 7*mm
    cx = x + 12*mm
    cy = y + h/2
    c.saveState()
    c.setFillColor(icon_bg)
    c.circle(cx, cy, icon_r, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 11)
    c.drawCentredString(cx, cy - 3.5, icon_text)
    c.restoreState()
    # Title
    c.saveState()
    c.setFillColor(PRIMARY)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(x + 22*mm, y + h - 12*mm, title)
    c.setFont("Helvetica", 8)
    c.setFillColor(GRAY)
    c.drawString(x + 22*mm, y + h - 19*mm, subtitle)
    c.restoreState()

def draw_step_circle(c, x, y, num, color=SECONDARY):
    """Draw a numbered step circle."""
    c.saveState()
    c.setFillColor(color)
    c.circle(x, y, 5*mm, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 10)
    c.drawCentredString(x, y - 3.5, str(num))
    c.restoreState()

def page1_overview(c):
    """Page 1: Title + High-Level System Overview."""
    # Header bar
    c.setFillColor(PRIMARY)
    c.rect(0, H - 35*mm, W, 35*mm, fill=1, stroke=0)

    # Title
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 22)
    c.drawString(20*mm, H - 18*mm, "Legend Rentals")
    c.setFont("Helvetica", 13)
    c.drawString(20*mm, H - 26*mm, "AR Command Center - System Flow")

    # Date badge
    c.setFont("Helvetica", 9)
    c.drawRightString(W - 20*mm, H - 18*mm, "June 2026")
    c.drawRightString(W - 20*mm, H - 26*mm, "v1.0")

    # Subtitle
    y = H - 52*mm
    c.setFillColor(DARK_GRAY)
    c.setFont("Helvetica", 11)
    c.drawString(20*mm, y, "How the system manages car rental contract follow-ups automatically")

    # === THREE MAIN SYSTEMS ===
    y = H - 78*mm
    box_w = 52*mm
    box_h = 28*mm
    gap = 12*mm
    start_x = (W - 3*box_w - 2*gap) / 2

    # Speed ERP
    draw_rounded_rect(c, start_x, y, box_w, box_h, fill=ACCENT, stroke=SECONDARY, stroke_width=1)
    c.setFillColor(SECONDARY)
    c.setFont("Helvetica-Bold", 11)
    c.drawCentredString(start_x + box_w/2, y + box_h - 11*mm, "Speed ERP")
    c.setFont("Helvetica", 7.5)
    c.setFillColor(GRAY)
    c.drawCentredString(start_x + box_w/2, y + box_h - 18*mm, "Car Rental Software")
    c.drawCentredString(start_x + box_w/2, y + box_h - 24*mm, "All contracts live here")

    # Arrow 1
    draw_arrow(c, start_x + box_w, y + box_h/2, start_x + box_w + gap, y + box_h/2, color=SECONDARY, width=2)

    # Dashboard
    dash_x = start_x + box_w + gap
    draw_rounded_rect(c, dash_x, y, box_w, box_h, fill=PRIMARY, stroke=PRIMARY, stroke_width=1)
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 11)
    c.drawCentredString(dash_x + box_w/2, y + box_h - 11*mm, "AR Dashboard")
    c.setFont("Helvetica", 7.5)
    c.setFillColor(HexColor("#D1D5DB"))
    c.drawCentredString(dash_x + box_w/2, y + box_h - 18*mm, "Your Control Center")
    c.drawCentredString(dash_x + box_w/2, y + box_h - 24*mm, "Track & take action")

    # Arrow 2
    draw_arrow(c, dash_x + box_w, y + box_h/2, dash_x + box_w + gap, y + box_h/2, color=EMERALD, width=2)

    # GallaBox
    gb_x = dash_x + box_w + gap
    draw_rounded_rect(c, gb_x, y, box_w, box_h, fill=HexColor("#ECFDF5"), stroke=EMERALD, stroke_width=1)
    c.setFillColor(EMERALD)
    c.setFont("Helvetica-Bold", 11)
    c.drawCentredString(gb_x + box_w/2, y + box_h - 11*mm, "GallaBox")
    c.setFont("Helvetica", 7.5)
    c.setFillColor(GRAY)
    c.drawCentredString(gb_x + box_w/2, y + box_h - 18*mm, "WhatsApp Business")
    c.drawCentredString(gb_x + box_w/2, y + box_h - 24*mm, "Send reminders")

    # Arrow labels
    c.setFont("Helvetica", 7)
    c.setFillColor(SECONDARY)
    c.drawCentredString(start_x + box_w + gap/2, y + box_h/2 + 4*mm, "Data flows in")
    c.setFillColor(EMERALD)
    c.drawCentredString(dash_x + box_w + gap/2, y + box_h/2 + 4*mm, "Messages go out")

    # === DATABASE ===
    db_y = y - 22*mm
    db_w = 40*mm
    db_x = (W - db_w) / 2
    draw_rounded_rect(c, db_x, db_y, db_w, 15*mm, fill=BLUE, stroke=BLUE)
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(W/2, db_y + 8*mm, "Supabase Database")
    c.setFont("Helvetica", 7)
    c.drawCentredString(W/2, db_y + 2.5*mm, "Stores everything safely")

    # Arrow from dashboard to DB
    draw_arrow(c, W/2, y, W/2, db_y + 15*mm, color=BLUE, width=1.5)

    # === WHAT THE SYSTEM DOES ===
    y = db_y - 18*mm
    c.setFillColor(PRIMARY)
    c.setFont("Helvetica-Bold", 13)
    c.drawString(20*mm, y, "What Does This System Do?")

    items = [
        ("Pulls contract data from Speed ERP", "automatically every morning at 4 AM, or when you upload a file"),
        ("Shows you who needs follow-up", "overdue contracts, pending calls, outstanding payments — all in one view"),
        ("Lets you track every action", "mark calls, record outcomes (Extended, Returning, Closed, Immobilised)"),
        ("Sends WhatsApp reminders", "one-click customer reminders via GallaBox WhatsApp Business"),
        ("Gives you real-time KPIs", "charts, contact rates, resolution rates, outstanding amounts"),
    ]

    y -= 8*mm
    for i, (title, desc) in enumerate(items):
        draw_step_circle(c, 25*mm, y, i + 1, SECONDARY)
        c.setFillColor(PRIMARY)
        c.setFont("Helvetica-Bold", 9.5)
        c.drawString(34*mm, y + 1*mm, title)
        c.setFont("Helvetica", 8)
        c.setFillColor(GRAY)
        c.drawString(34*mm, y - 6.5*mm, desc)
        y -= 17*mm

    # === WHO USES IT ===
    y -= 5*mm
    c.setFillColor(PRIMARY)
    c.setFont("Helvetica-Bold", 13)
    c.drawString(20*mm, y, "Who Uses It?")

    y -= 12*mm
    roles = [
        ("AR Team", "Daily — follow up on contracts, make calls, send WhatsApp", SECONDARY),
        ("Branch Managers", "Monitor team progress, check resolution rates", BLUE),
        ("Management", "Overview of outstanding receivables and KPIs", EMERALD),
    ]

    role_w = (W - 40*mm - 8*mm) / 3
    for i, (role, desc, color) in enumerate(roles):
        rx = 20*mm + i * (role_w + 4*mm)
        draw_rounded_rect(c, rx, y - 15*mm, role_w, 28*mm, fill=white, stroke=HexColor("#E5E7EB"))
        c.setFillColor(color)
        c.setFont("Helvetica-Bold", 9)
        c.drawCentredString(rx + role_w/2, y + 7*mm, role)
        c.setFillColor(GRAY)
        c.setFont("Helvetica", 7)
        # Word wrap the description
        words = desc.split()
        line = ""
        ly = y - 1*mm
        for w in words:
            if c.stringWidth(line + " " + w, "Helvetica", 7) < role_w - 6*mm:
                line = (line + " " + w).strip()
            else:
                c.drawCentredString(rx + role_w/2, ly, line)
                ly -= 8
                line = w
        if line:
            c.drawCentredString(rx + role_w/2, ly, line)

    # Footer
    c.setFillColor(LIGHT_GRAY)
    c.rect(0, 0, W, 10*mm, fill=1, stroke=0)
    c.setFillColor(GRAY)
    c.setFont("Helvetica", 7)
    c.drawCentredString(W/2, 3.5*mm, "Legend Rentals  |  AR Command Center  |  Confidential")


def page2_daily_flow(c):
    """Page 2: Daily Workflow — Step by Step."""
    c.showPage()

    # Header
    c.setFillColor(PRIMARY)
    c.rect(0, H - 20*mm, W, 20*mm, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 15)
    c.drawString(20*mm, H - 14*mm, "Daily Workflow — How It Works Every Day")

    y = H - 35*mm

    # Timeline
    steps = [
        {
            "time": "4:00 AM",
            "title": "Automatic Data Refresh",
            "desc": "The system automatically connects to Speed ERP and pulls the latest\ncontract data. No one needs to be awake — it happens on its own.",
            "color": VIOLET,
            "icon": "A"
        },
        {
            "time": "8:00 AM",
            "title": "AR Team Opens Dashboard",
            "desc": "The team sees today's numbers at a glance:\n- How many contracts are due today\n- How many are overdue\n- Total outstanding amount (AED)",
            "color": SECONDARY,
            "icon": "B"
        },
        {
            "time": "8:30 AM",
            "title": "Start Making Calls",
            "desc": "Click any contract to see customer details and phone number.\nAfter each call, mark the result:\n   Called  /  No Answer  /  Callback Needed",
            "color": BLUE,
            "icon": "C"
        },
        {
            "time": "9:00 AM",
            "title": "Send WhatsApp Reminders",
            "desc": "For customers you couldn't reach by phone, send a WhatsApp\nreminder with one click. The message goes through GallaBox\nusing an approved template.",
            "color": EMERALD,
            "icon": "D"
        },
        {
            "time": "Ongoing",
            "title": "Record Outcomes",
            "desc": "As customers respond, update the contract status:\n   Extended  -  Customer renewed the contract\n   Returning  -  Vehicle is coming back\n   Closed  -  Agreement fully settled\n   Immobilised  -  Vehicle has been locked",
            "color": AMBER,
            "icon": "E"
        },
        {
            "time": "End of Day",
            "title": "Check Progress",
            "desc": "Dashboard shows your contact rate % and resolution rate %.\nManagement can see the overall picture without asking anyone.",
            "color": RED,
            "icon": "F"
        },
    ]

    timeline_x = 38*mm
    box_x = 52*mm
    box_w = W - box_x - 20*mm

    for i, step in enumerate(steps):
        box_h = 32*mm

        # Time label
        c.setFillColor(step["color"])
        c.setFont("Helvetica-Bold", 8)
        c.drawRightString(timeline_x - 6*mm, y - 5*mm, step["time"])

        # Step circle on timeline
        draw_step_circle(c, timeline_x, y - 4*mm, i + 1, step["color"])

        # Connecting line
        if i < len(steps) - 1:
            c.saveState()
            c.setStrokeColor(HexColor("#E5E7EB"))
            c.setLineWidth(1.5)
            c.setDash(2, 2)
            c.line(timeline_x, y - 9*mm, timeline_x, y - box_h - 4*mm)
            c.restoreState()

        # Content box
        draw_rounded_rect(c, box_x, y - box_h + 3*mm, box_w, box_h, fill=white, stroke=HexColor("#E5E7EB"))

        c.setFillColor(PRIMARY)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(box_x + 5*mm, y - 5*mm, step["title"])

        c.setFont("Helvetica", 7.5)
        c.setFillColor(GRAY)
        desc_lines = step["desc"].split("\n")
        ly = y - 13*mm
        for line in desc_lines:
            c.drawString(box_x + 5*mm, ly, line)
            ly -= 9

        y -= box_h + 6*mm

    # Footer
    c.setFillColor(LIGHT_GRAY)
    c.rect(0, 0, W, 10*mm, fill=1, stroke=0)
    c.setFillColor(GRAY)
    c.setFont("Helvetica", 7)
    c.drawCentredString(W/2, 3.5*mm, "Legend Rentals  |  AR Command Center  |  Page 2")


def page3_data_flow(c):
    """Page 3: Data Flow — How Information Moves."""
    c.showPage()

    # Header
    c.setFillColor(PRIMARY)
    c.rect(0, H - 20*mm, W, 20*mm, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 15)
    c.drawString(20*mm, H - 14*mm, "How Data Moves Through the System")

    y = H - 38*mm

    # === 3 WAYS DATA COMES IN ===
    c.setFillColor(PRIMARY)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(20*mm, y, "3 Ways Contract Data Enters the Dashboard")

    y -= 8*mm
    methods = [
        {
            "title": "Automatic (Recommended)",
            "desc": "Every day at 4 AM Dubai time,\nthe system logs into Speed ERP\nand pulls the latest data.\nNo human action needed.",
            "color": EMERALD,
            "badge": "AUTO",
            "highlight": True,
        },
        {
            "title": "File Upload",
            "desc": "Export an Excel/CSV file from\nSpeed ERP and drag it into\nthe Dashboard upload page.\nGood for ad-hoc updates.",
            "color": BLUE,
            "badge": "MANUAL",
            "highlight": False,
        },
        {
            "title": "Browser Scrape",
            "desc": "Claude connects to Speed ERP\nthrough the browser and extracts\ndata directly from the screen.\nUseful for on-demand refresh.",
            "color": VIOLET,
            "badge": "ON-DEMAND",
            "highlight": False,
        },
    ]

    card_w = (W - 40*mm - 8*mm) / 3
    card_h = 52*mm

    for i, m in enumerate(methods):
        cx = 20*mm + i * (card_w + 4*mm)
        border = m["color"] if m["highlight"] else HexColor("#E5E7EB")
        bw = 1.5 if m["highlight"] else 0.5
        draw_rounded_rect(c, cx, y - card_h, card_w, card_h, fill=white, stroke=border, stroke_width=bw)

        # Badge
        badge_w = c.stringWidth(m["badge"], "Helvetica-Bold", 7) + 6*mm
        badge_x = cx + card_w/2 - badge_w/2
        draw_rounded_rect(c, badge_x, y - 9*mm, badge_w, 5*mm, r=2*mm, fill=m["color"])
        c.setFillColor(white)
        c.setFont("Helvetica-Bold", 7)
        c.drawCentredString(cx + card_w/2, y - 7*mm, m["badge"])

        # Title
        c.setFillColor(PRIMARY)
        c.setFont("Helvetica-Bold", 9)
        c.drawCentredString(cx + card_w/2, y - 17*mm, m["title"])

        # Description
        c.setFont("Helvetica", 7)
        c.setFillColor(GRAY)
        ly = y - 24*mm
        for line in m["desc"].split("\n"):
            c.drawCentredString(cx + card_w/2, ly, line)
            ly -= 8

    # === WHAT HAPPENS TO THE DATA ===
    y -= card_h + 16*mm
    c.setFillColor(PRIMARY)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(20*mm, y, "What Happens to the Data")

    y -= 5*mm
    pipeline = [
        ("Data arrives", "From ERP via any of the 3 methods above", SECONDARY),
        ("Smart matching", "System checks if contract already exists (by Agreement No.)", BLUE),
        ("New contract?", "Creates a new entry with all details", EMERALD),
        ("Existing contract?", "Updates info but KEEPS your call notes & status", AMBER),
        ("Dashboard refreshes", "You see the latest numbers immediately", VIOLET),
    ]

    pipe_x = 30*mm
    pipe_w = W - 60*mm
    step_h = 14*mm

    for i, (title, desc, color) in enumerate(pipeline):
        sy = y - i * (step_h + 3*mm)

        # Step indicator
        draw_rounded_rect(c, pipe_x, sy - step_h, pipe_w, step_h, fill=white, stroke=HexColor("#E5E7EB"))

        # Color bar on left
        c.setFillColor(color)
        c.rect(pipe_x, sy - step_h, 3*mm, step_h, fill=1, stroke=0)

        # Number
        c.setFont("Helvetica-Bold", 9)
        c.drawString(pipe_x + 6*mm, sy - 6*mm, str(i + 1) + ".")

        # Text
        c.setFillColor(PRIMARY)
        c.setFont("Helvetica-Bold", 9)
        c.drawString(pipe_x + 14*mm, sy - 6*mm, title)
        c.setFillColor(GRAY)
        c.setFont("Helvetica", 7.5)
        c.drawString(pipe_x + 14*mm, sy - 12*mm, desc)

        # Arrow down
        if i < len(pipeline) - 1:
            ax = pipe_x + pipe_w/2
            draw_arrow(c, ax, sy - step_h, ax, sy - step_h - 3*mm, color=HexColor("#D1D5DB"), width=1)

    # === KEY POINT ===
    y = y - len(pipeline) * (step_h + 3*mm) - 12*mm
    draw_rounded_rect(c, 20*mm, y - 18*mm, W - 40*mm, 18*mm, fill=HexColor("#FEF3C7"), stroke=AMBER, stroke_width=1)
    c.setFillColor(AMBER)
    c.setFont("Helvetica-Bold", 9)
    c.drawString(28*mm, y - 6*mm, "Important:")
    c.setFillColor(DARK_GRAY)
    c.setFont("Helvetica", 8)
    c.drawString(28*mm, y - 14*mm, "When data is refreshed, all your previous work (call notes, WhatsApp status, resolutions) is preserved. Nothing is lost.")

    # Footer
    c.setFillColor(LIGHT_GRAY)
    c.rect(0, 0, W, 10*mm, fill=1, stroke=0)
    c.setFillColor(GRAY)
    c.setFont("Helvetica", 7)
    c.drawCentredString(W/2, 3.5*mm, "Legend Rentals  |  AR Command Center  |  Page 3")


def page4_dashboard_guide(c):
    """Page 4: Dashboard Views & Features."""
    c.showPage()

    # Header
    c.setFillColor(PRIMARY)
    c.rect(0, H - 20*mm, W, 20*mm, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 15)
    c.drawString(20*mm, H - 14*mm, "Dashboard Views & What You Can Do")

    y = H - 38*mm

    # === VIEW 1: OVERVIEW ===
    c.setFillColor(SECONDARY)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(20*mm, y, "1. Overview (Home Screen)")

    y -= 5*mm
    features_1 = [
        "Total contracts count with due today & overdue breakdown",
        "Total outstanding receivables in AED",
        "Contact rate — what % of customers have been called",
        "Resolution rate — what % of contracts have an outcome",
        "Resolution chart — donut showing Extended / Returning / Closed / Immobilised",
        "Contact chart — bar chart showing Called / No Answer / Callback / Pending",
        "Needs Attention — top 5 most overdue contracts that need action",
    ]
    for f in features_1:
        c.setFillColor(EMERALD)
        c.circle(24*mm, y - 1*mm, 1.2*mm, fill=1, stroke=0)
        c.setFillColor(DARK_GRAY)
        c.setFont("Helvetica", 8)
        c.drawString(28*mm, y - 3*mm, f)
        y -= 9*mm

    y -= 5*mm

    # === VIEW 2: CONTRACTS ===
    c.setFillColor(SECONDARY)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(20*mm, y, "2. Contracts (Work Screen)")

    y -= 5*mm
    features_2 = [
        "Status cards at top — click any card to filter (Due Today, Overdue, Called, Not Called, etc.)",
        "Search by customer name, agreement number, or phone number",
        "Filter by category, call status, or resolution",
        "Full table with: Customer, Phone, Vehicle, Status, Days Overdue, Outstanding",
        "Phone number is clickable — tap to call directly from your phone",
        "3-dot menu on each row for quick actions (Call / WhatsApp / Resolution)",
        "Click customer name to expand and see email, sales person, branch, dates, notes",
    ]
    for f in features_2:
        c.setFillColor(BLUE)
        c.circle(24*mm, y - 1*mm, 1.2*mm, fill=1, stroke=0)
        c.setFillColor(DARK_GRAY)
        c.setFont("Helvetica", 8)
        c.drawString(28*mm, y - 3*mm, f)
        y -= 9*mm

    y -= 5*mm

    # === VIEW 3: UPLOAD ===
    c.setFillColor(SECONDARY)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(20*mm, y, "3. Upload (Import Screen)")

    y -= 5*mm
    features_3 = [
        "Select category: Due To Close Today or Over Due Closing",
        "Drag and drop Excel (.xlsx) or CSV file",
        "Download sample CSV to see the expected format",
        "System shows how many rows were new vs. updated",
    ]
    for f in features_3:
        c.setFillColor(VIOLET)
        c.circle(24*mm, y - 1*mm, 1.2*mm, fill=1, stroke=0)
        c.setFillColor(DARK_GRAY)
        c.setFont("Helvetica", 8)
        c.drawString(28*mm, y - 3*mm, f)
        y -= 9*mm

    y -= 8*mm

    # === QUICK ACTIONS TABLE ===
    c.setFillColor(PRIMARY)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(20*mm, y, "Quick Actions Reference")

    y -= 3*mm
    table_data = [
        ("Action", "What It Does", "When To Use"),
        ("Mark Called", "Records that you spoke with the customer", "After a successful phone call"),
        ("Mark No Answer", "Records that the phone was not answered", "After an unanswered call"),
        ("Mark Callback", "Flags for a follow-up call later", "Customer asked to call back"),
        ("Send WhatsApp", "Sends a template reminder via WhatsApp", "Customer not reachable by phone"),
        ("Set Extended", "Contract has been renewed/extended", "Customer confirmed extension"),
        ("Set Returning", "Vehicle is being returned", "Customer agreed to return"),
        ("Set Closed", "Agreement fully settled", "Contract is complete"),
        ("Set Immobilised", "Vehicle has been locked/disabled", "Escalation action taken"),
    ]

    col_widths = [32*mm, 55*mm, 55*mm]
    row_h = 8*mm
    tx = 20*mm

    for i, (c1, c2, c3) in enumerate(table_data):
        ry = y - i * row_h
        if i == 0:
            c.setFillColor(PRIMARY)
            c.rect(tx, ry - row_h, sum(col_widths), row_h, fill=1, stroke=0)
            c.setFillColor(white)
            c.setFont("Helvetica-Bold", 7.5)
        else:
            bg = white if i % 2 == 1 else LIGHT_GRAY
            c.setFillColor(bg)
            c.rect(tx, ry - row_h, sum(col_widths), row_h, fill=1, stroke=0)
            c.setFillColor(DARK_GRAY)
            c.setFont("Helvetica", 7.5)

        c.drawString(tx + 2*mm, ry - 5.5*mm, c1)
        c.drawString(tx + col_widths[0] + 2*mm, ry - 5.5*mm, c2)
        c.drawString(tx + col_widths[0] + col_widths[1] + 2*mm, ry - 5.5*mm, c3)

    # Footer
    c.setFillColor(LIGHT_GRAY)
    c.rect(0, 0, W, 10*mm, fill=1, stroke=0)
    c.setFillColor(GRAY)
    c.setFont("Helvetica", 7)
    c.drawCentredString(W/2, 3.5*mm, "Legend Rentals  |  AR Command Center  |  Page 4")


def page5_connections(c):
    """Page 5: System Connections & Access."""
    c.showPage()

    # Header
    c.setFillColor(PRIMARY)
    c.rect(0, H - 20*mm, W, 20*mm, fill=1, stroke=0)
    c.setFillColor(white)
    c.setFont("Helvetica-Bold", 15)
    c.drawString(20*mm, H - 14*mm, "System Connections & Access")

    y = H - 40*mm

    # Systems connected
    systems = [
        {
            "name": "Speed Auto Systems (ERP)",
            "url": "legenduae.speedautosystems.com",
            "what": "Where all rental agreements, vehicle data, and customer info lives",
            "connection": "Daily automatic pull at 4 AM + manual upload",
            "color": SECONDARY,
        },
        {
            "name": "AR Command Center (Dashboard)",
            "url": "legend-ar-dashboard.vercel.app",
            "what": "Where the AR team works — views contracts, makes calls, tracks progress",
            "connection": "Open in any browser, works on desktop and mobile",
            "color": PRIMARY,
        },
        {
            "name": "Supabase (Database)",
            "url": "Cloud-hosted PostgreSQL database",
            "what": "Stores all contract data, call logs, action history safely in the cloud",
            "connection": "Connected automatically — no login needed",
            "color": BLUE,
        },
        {
            "name": "GallaBox (WhatsApp)",
            "url": "server.gallabox.com",
            "what": "Sends WhatsApp Business messages to customers using approved templates",
            "connection": "Triggered from Dashboard when you click 'Send WhatsApp'",
            "color": EMERALD,
        },
        {
            "name": "Vercel (Hosting)",
            "url": "vercel.com",
            "what": "Hosts the Dashboard website and runs the daily 4 AM data scraper",
            "connection": "Auto-deploys when code is updated on GitHub",
            "color": DARK_GRAY,
        },
    ]

    card_h = 30*mm
    card_w = W - 40*mm

    for i, sys in enumerate(systems):
        sy = y - i * (card_h + 4*mm)
        draw_rounded_rect(c, 20*mm, sy - card_h, card_w, card_h, fill=white, stroke=HexColor("#E5E7EB"))

        # Color bar
        c.setFillColor(sys["color"])
        c.rect(20*mm, sy - card_h, 3*mm, card_h, fill=1, stroke=0)

        # Name
        c.setFillColor(PRIMARY)
        c.setFont("Helvetica-Bold", 10)
        c.drawString(28*mm, sy - 7*mm, sys["name"])

        # URL
        c.setFillColor(sys["color"])
        c.setFont("Helvetica", 7)
        c.drawString(28*mm, sy - 14*mm, sys["url"])

        # What
        c.setFillColor(DARK_GRAY)
        c.setFont("Helvetica", 8)
        c.drawString(28*mm, sy - 21*mm, sys["what"])

        # Connection
        c.setFillColor(GRAY)
        c.setFont("Helvetica", 7)
        c.drawString(28*mm, sy - 27*mm, "Connection: " + sys["connection"])

    # === NEED HELP ===
    y = y - len(systems) * (card_h + 4*mm) - 8*mm
    draw_rounded_rect(c, 20*mm, y - 22*mm, card_w, 22*mm, fill=ACCENT, stroke=SECONDARY, stroke_width=1)
    c.setFillColor(SECONDARY)
    c.setFont("Helvetica-Bold", 10)
    c.drawString(28*mm, y - 6*mm, "Need Help?")
    c.setFillColor(DARK_GRAY)
    c.setFont("Helvetica", 8)
    c.drawString(28*mm, y - 14*mm, "Dashboard URL:  legend-ar-dashboard.vercel.app")
    c.drawString(28*mm, y - 21*mm, "For technical issues, contact your system administrator.")

    # Footer
    c.setFillColor(LIGHT_GRAY)
    c.rect(0, 0, W, 10*mm, fill=1, stroke=0)
    c.setFillColor(GRAY)
    c.setFont("Helvetica", 7)
    c.drawCentredString(W/2, 3.5*mm, "Legend Rentals  |  AR Command Center  |  Page 5")


# === GENERATE PDF ===
output_path = "/Users/pw/Desktop/Workflows/legend-ar-dashboard/Legend-AR-System-Flow.pdf"
c = canvas.Canvas(output_path, pagesize=A4)
c.setTitle("Legend Rentals - AR Command Center System Flow")
c.setAuthor("Legend Rentals")
c.setSubject("System Flow Diagram")

page1_overview(c)
page2_daily_flow(c)
page3_data_flow(c)
page4_dashboard_guide(c)
page5_connections(c)

c.save()
print(f"PDF generated: {output_path}")
