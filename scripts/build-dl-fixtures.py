"""Regenerates fixtures/*-v1.json from the local _reference captures (run: python -X utf8 scripts/build-dl-fixtures.py).

Text is copied as stored, source typos included. The only edits are the ones the schema needs:
- HFCL: `GREEN (limited)` -> GREEN, `0.47 x` -> `0.47x` in schema-templated fields, U verdicts move to DATA GAPS.
- Anything with no schema slot goes to that panel's gaps, so nothing is dropped silently.
"""
import json
import re
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REF = ROOT / "_reference"
OUT = ROOT / "fixtures"
DISCLAIMER = "Paper analysis only, not advice."
TABS = ["F1 Summary", "F2 Forensic & BS", "F3 Scorecard", "F4 Management", "F5 Sentiment", "F6 Business", "F7 Financials", "F8 Growth/ROCE", "F9 Calls", "F10 Price ranges", "F11 Franchise", "F12 Cost & downside", "F13 Investors' lens", "F14 Execution", "F15 Sell-side", "F16 Stakeholders", "F17 Your research (uploaded)"]
CATEGORIES = ["Cash conversion", "Receivables, WC & inventory", "Leverage & debt service", "Earnings quality & one-offs", "Growth / order-book quality", "External watchers", "Integrity, capital & related parties"]
INVESTORS = ["Buffett & Munger", "Terry Smith", "Greenblatt", "Sleep & Zakaria", "Raamdeo Agrawal", "Fisher", "Druckenmiller"]
LENSES = ["Government / policy", "Regulator / safety", "Customers", "Suppliers", "Employees", "Lenders / capital", "Community & environment", "Competitors / entrants"]
F2_COLUMNS = ["#", "Check", "Threshold", "Verdict", "Evidence"]
LEIBOWITZ_K = "k \\\\ R"  # two literal backslashes, as frozen in the schema


def tbl(title, columns, rows):
    return {"title": title, "columns": columns, "rows": rows}


def write(name, report):
    (OUT / f"{name}-v1.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def envelope(chrome, footer, panels):
    return {"schema": "dl-equity-report/v1", "chrome": {**chrome, "tabs": TABS}, "footer": {"disclaimer": DISCLAIMER, **footer}, "panels": {**panels, "f17": {"kind": "upload_placeholder"}}}


# ---------------------------------------------------------------- OLECTRA (plain-text panels)


class Lines:
    """One F*.txt panel: lead title, numbered takeaways, body, SOURCES & GAPS."""

    def __init__(self, n, lead=True):
        self.all = (REF / "olectra-panels" / f"F{n}.txt").read_text(encoding="utf-8").splitlines()
        cut = self.all.index("SOURCES & GAPS")
        self.source_text = self.all[cut + 1]
        self.body = self.all[:cut]
        if lead:
            self.lead = self.body[0]
            self.takeaways, rest = takeaways(self.body[1:])
            self.body = rest

    def between(self, start, end=None):
        i = self.body.index(start) + 1
        return self.body[i : self.body.index(end, i) if end else len(self.body)]

    def table(self, title, columns, end=None):
        """Rows between a table's title and the next heading; blank column names have no source line."""
        lines = self.between(title, end)
        named = [c for c in columns if c]
        assert lines[: len(named)] == named, (title, lines[: len(named)])
        return tbl(title, columns, chunk(lines[len(named) :], len(columns)))

    def base(self, extra_gaps=()):
        return {"leadTitle": self.lead, "takeaways": self.takeaways, "sourcesAndGaps": olectra_sources(self.source_text, extra_gaps)}


def takeaways(lines):
    items, i = [], 0
    while i < len(lines) and re.fullmatch(r"\d+\.", lines[i]):
        items.append(lines[i + 1])
        i += 2
    return items, lines[i:]


def chunk(lines, n):
    assert len(lines) % n == 0, (len(lines), n, lines[:n])
    return [lines[i : i + n] for i in range(0, len(lines), n)]


def olectra_sources(text, extra_gaps=()):
    sources, rest = text.split(" EST = my estimate. Gaps: ")
    gaps, tail = rest.rsplit(". ", 1)
    assert tail == DISCLAIMER
    return {"sources": sources.rstrip(".").split("; "), "estDefinition": "EST = my estimate.", "gaps": [*gaps.split(", "), *extra_gaps], "disclaimer": DISCLAIMER}


def olectra_f2():
    p = Lines(2, lead=False)
    b = p.body
    assert b[0] == "FORENSIC & BALANCE SHEET · COMBINED VERDICT" and b[3] == "SUB-TABS"
    lead = b[4]
    items, rest = takeaways(b[5:])
    headline, why, tally = rest[0], rest[1].removeprefix("Why: "), rest[2]
    assert rest[3] == "CATEGORY SCORECARD · TAP A ROW FOR ITS CHECKS"
    gaps_at = rest.index("DATA GAPS · 5 CHECKS NOT SCORED")
    body = rest[4:gaps_at]
    categories = []
    for k, name in enumerate(CATEGORIES):
        start = body.index(name)
        end = body.index(CATEGORIES[k + 1]) if k + 1 < len(CATEGORIES) else len(body)
        cat = body[start:end]
        r, a, g, u = (int(x[:-1]) for x in cat[1:5])
        assert cat[6] == "▾" and cat[7:12] == F2_COLUMNS, name
        categories.append({"name": name, "counts": {"r": r, "a": a, "g": g, "u": u}, "summary": cat[5], "checks": tbl(name, F2_COLUMNS, chunk(cat[12:], 5))})
    gap_cols = ["#", "Check", "Category", "What is missing"]
    assert rest[gaps_at + 1 : gaps_at + 5] == gap_cols
    return {
        "leadTitle": lead,
        "takeaways": items,
        "sourcesAndGaps": olectra_sources(p.source_text),
        "combinedVerdict": b[1],
        "deduplicationNote": b[2],
        "stress": {"headline": headline, "why": why, "tally": tally},
        "categories": categories,
        "dataGaps": tbl(rest[gaps_at], gap_cols, chunk(rest[gaps_at + 5 :], 4)),
    }


def olectra_f13():
    p = Lines(13)
    key = next(l for l in p.body if l.startswith("Key disagreement: "))
    tie = next(l for l in p.body if l.startswith("Tie-breaker: "))
    legend = next(l for l in p.body if l.startswith("✓ pass"))
    b = p.body[p.body.index(tie) + 1 : p.body.index(legend)]
    investors, i = [], 0
    for name in INVESTORS:
        assert b[i] == name, (b[i], name)
        stance, line = b[i + 1], b[i + 2]
        i += 3
        criteria = []
        while b[i] in "✓◐✗":
            assert b[i + 2] == ":"
            criteria.append({"mark": b[i], "label": b[i + 1], "evidence": b[i + 3]})
            i += 4
        investors.append({"name": name, "stance": stance, "criteriaLine": line, "criteria": criteria, "quote": b[i]})
        i += 1
    c = p.between("CONSENSUS")
    return {
        **p.base(),
        "consensus": {"wouldBuy": int(c[0].split()[0]), "watchlist": int(c[1].split()[0]), "pass": int(c[2].split()[0]), "note": c[3]},
        "keyDisagreement": key.removeprefix("Key disagreement: "),
        "tieBreaker": tie.removeprefix("Tie-breaker: "),
        "investors": investors,
        "methodologyNote": legend,
    }


def olectra_f14():
    p = Lines(14)
    state, price_line, action = p.body[0], p.body[1], p.body[2]
    size_at = p.body.index("Size:")
    framework = next(l for l in p.body if l.startswith("Framework: "))
    rules = chunk(p.between("RULES (ART OF EXECUTION)", framework), 2)
    return {
        **p.base(),
        "state": state,
        "priceLine": price_line,
        "todaysAction": action,
        "extensionMeter": p.table("EXTENSION METER", ["", ""], "STAGED ENTRY (3 TRANCHES)"),
        "stagedEntry": p.table("STAGED ENTRY (3 TRANCHES)", ["", "", "", ""], "Size:"),
        "size": p.body[size_at + 1],
        "rules": [{"label": a, "text": t} for a, t in rules],
        "frameworkNote": framework,
    }


def olectra_f16():
    p = Lines(16)
    banner = p.body[0]
    adjusted = next(l for l in p.body if l.startswith("Stakeholder-adjusted multiple"))
    risks = p.body[p.body.index("Top 3 hidden risks (not flagged elsewhere):") + 1]
    wants = p.body[-1]
    lenses = []
    for k, name in enumerate(LENSES):
        s = p.body.index(f"{k + 1} {name}")
        assert p.body[s + 3] == "Who:" and p.body[s + 5] == "Evidence:" and p.body[s + 7] == "Hidden risk:"
        lenses.append({"name": name, "flag": p.body[s + 1], "multiple": p.body[s + 2].removeprefix("· "), "who": p.body[s + 4], "evidence": p.body[s + 6], "hiddenRisk": p.body[s + 8]})
    return {
        **p.base(),
        "stripBanner": banner,
        "adjustedMultiple": adjusted,
        "topHiddenRisks": [x.strip() for x in re.split(r"\(\d\) ", risks) if x.strip()],
        "lenses": lenses,
        "wantsNote": wants,
    }


def build_olectra():
    f1, f3, f4, f5, f6, f7, f8, f9, f10, f11, f12, f15 = (Lines(n) for n in (1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15))

    log_title = next(l for l in f4.body if l.startswith("KEY-PERSON CHANGE LOG"))
    culture_title = next(l for l in f4.body if l.startswith("CULTURE STRIP"))
    mgmt = next(l for l in f4.body if l.startswith("MANAGEMENT CHANGE & CULTURE"))
    panel_f5_method = next(l for l in f5.body if l.startswith("Method: "))
    mood_title = next(l for l in f5.body if l.startswith("STOCK MOOD"))
    theme = next(l for l in f5.body if l.startswith("INDUSTRY / THEME SENTIMENT"))
    book_title = next(l for l in f6.body if l.startswith("ORDER BOOK"))
    grid_title = next(l for l in f11.body if l.startswith("LEIBOWITZ GRID"))
    rev_title = next(l for l in f12.body if l.startswith("REVENUE SCENARIOS"))
    strip_title = next(l for l in f15.body if l.startswith("CONSENSUS STRIP"))
    calls_title = next(l for l in f15.body if l.startswith("CALLS FOUND"))
    trend_title = next(l for l in f15.body if l.startswith("TREND ("))
    search = f15.body[-1]

    key = f9.between("KEY TAKEAWAYS", "(A) DELTA VS LAST CALL")
    guide = tbl("KEY TAKEAWAYS", ["", "What was said", "Number", "Tag", "So what (price ranges)"], chunk(key[5:], 5))
    assert key[1:5] == ["What was said", "Number", "Tag", "So what (price ranges)"]
    language = f9.between("(B) LANGUAGE SIGNALS", "(C) ACTIONABLE")
    scorecard = f9.between("CALL LANGUAGE SCORECARD")
    rr = f10.body[0]
    ladder = chunk(f10.between("PRICE LADDER", "WHAT WOULD NEED TO HAPPEN"), 2)
    need = f10.between("WHAT WOULD NEED TO HAPPEN", "Method detail")

    return envelope(
        {
            # ponytail: sector and as-of are not in the stored panels, so U. Thesis is F1's lead; rating and target are F10's stored line.
            "kicker": "EQUITY RESEARCH · U · AS OF U · PAPER ANALYSIS ONLY, NOT ADVICE",
            "companyLine": "Olectra Greentech (NSE: OLECTRA)",
            "thesis": f1.lead,
            "ratingPaper": "HOLD",
            "target": "₹1,123",
            "price": "₹951 (30 Oct 2026)",
        },
        {
            "asOfIst": "U",
            "priceDate": "30 Oct 2026",
            "sourcesSummary": f1.source_text.split(" EST = my estimate.")[0],
            "estUDisclaimer": "EST = my estimate. Unknown or missing data is labelled U, gap or NO DATA.",
        },
        {
            "f1": {**f1.base(), "topInsights": f1.between("TOP 3 INSIGHTS")},
            "f2": olectra_f2(),
            "f3": {**f3.base(["Spec lists an Interest cover scorecard row; the stored panel capture has none (gap)."]), "scorecard": f3.table("SCORECARD (EST)", ["Model", "Score", "Read"])},
            "f4": {
                **f4.base(),
                "ownership": f4.table("OWNERSHIP", ["Item", "Value"], mgmt),
                "managementChange": {"banner": mgmt, "summary": f4.body[f4.body.index(mgmt) + 1]},
                "changeLog": f4.table(log_title, ["Date", "Person", "Role", "In/Out", "Stated reason / profile", "AR 0/+1", "AR 20d"], "SIGNAL STRIP"),
                "signalStrip": f4.table("SIGNAL STRIP", ["Signal", "Reading", "Flag"], culture_title),
                "cultureStrip": f4.table(culture_title, ["Source", "Reading", "Note"], "WHAT THE LITERATURE SAYS"),
                "literature": f4.between("WHAT THE LITERATURE SAYS"),
            },
            "f5": {
                **f5.base(),
                "themeBanner": theme,
                "themeMood": f5.body[f5.body.index(theme) + 1].removeprefix("Theme mood: "),
                "plainRead": f5.body[f5.body.index(theme) + 2].removeprefix("Plain read: "),
                "themeStrip": f5.table("THEME STRIP (EST where marked)", ["Signal", "Reading", "Read"], "3 NARRATIVES ON X AND IN THE NEWS"),
                "narratives": f5.between("3 NARRATIVES ON X AND IN THE NEWS", panel_f5_method),
                "methodNote": panel_f5_method,
                "stockMood": f5.table(mood_title, ["Signal", "Reading"]),
            },
            "f6": {
                **f6.base(),
                "bottomUp": f6.table("FY27E BOTTOM-UP REVENUE (₹ cr, EST)", ["Line", "FY27E", "Basis"], book_title),
                "orderBook": f6.table(book_title, ["Order", "Size", "Delivered", "Status"], "EVEY / MEIL STRUCTURE"),
                "structure": f6.table("EVEY / MEIL STRUCTURE", ["Entity", "Role"]),
            },
            "f7": {**f7.base(), "pl": f7.table("P&L (₹ cr, consolidated)", ["", "FY23", "FY24", "FY25", "FY26", "TTM", "FY27E", "FY28E"])},
            "f8": {**f8.base(), "returns": f8.table("RETURNS", ["Metric", "Value"])},
            "f9": {
                **f9.base(),
                "keyTakeawaysNote": key[0],
                "guidance": guide,
                "delta": {
                    "new": f9.between("NEW", "DROPPED / GONE QUIET"),
                    "droppedOrGoneQuiet": f9.between("DROPPED / GONE QUIET", "GUIDANCE RAISED / CUT"),
                    "guidanceRaisedCut": f9.between("GUIDANCE RAISED / CUT", "(B) LANGUAGE SIGNALS"),
                },
                "language": {
                    "confidenceScore": language[0],
                    "confidenceNote": language[1],
                    "hedgingVsCertainty": language[3],
                    "evasiveAnswers": language[language.index("EVASIVE ANSWERS") + 1 : language.index("ANALYST PUSHBACK TOPICS")],
                    "analystPushbackTopics": language[language.index("ANALYST PUSHBACK TOPICS") + 1 :],
                },
                "callLanguageScorecard": {"reading": scorecard[0], "note": " ".join(scorecard[1:])},
                "whatToWatch": f9.table("WHAT TO WATCH NEXT QUARTER", ["KPI", "Threshold (good / bad)"], "THESIS IMPACT"),
                "thesisImpact": f9.table("THESIS IMPACT", ["Tab", "Effect", "Why"], "CALL LANGUAGE SCORECARD"),
            },
            "f10": {
                **f10.base(),
                # Stored as is: this strip says 0.76x while the panel's lead and F13/F15 say 0.75x.
                "rewardRisk": {"strip": rr, "detail": f10.body[1]},
                "scenarios": f10.table("SCENARIOS: one row per independent lens", ["Lens", "Scenario", "Price", "vs now", "What it tells you"], "PRICE LADDER"),
                "priceLadder": [{"label": a, "value": v} for a, v in ladder],
                "whatWouldNeedToHappen": need[:-1],
                "weightedTarget": need[-1],
                "methodDetail": f10.between("Method detail")[0],
            },
            "f11": {**f11.base(), "grid": f11.table(grid_title, [LEIBOWITZ_K, "R 15%", "R 21%", "R 26%", "Today %"])},
            "f12": {
                **f12.base(),
                "costSplit": f12.table("COST SPLIT (EST)", ["Item", "Value", "Method"], rev_title),
                "revenueScenarios": f12.table(rev_title, ["Revenue Δ", "Revenue", "EBITDA", "Margin", "EBIT", "PAT", "EPS ₹", "Value ₹"], "MARGIN SHOCK (revenue held at TTM)"),
                "marginShock": f12.table("MARGIN SHOCK (revenue held at TTM)", ["EBITDA margin", "EPS", "Value @30x"]),
            },
            "f13": olectra_f13(),
            "f14": olectra_f14(),
            "f15": {
                **f15.base(),
                "consensusStrip": f15.table(strip_title, ["Metric", "Value", "Note"], calls_title),
                "calls": f15.table(calls_title, ["Date", "Broker", "Type", "Rating", "Target", "Upside", "Thesis / estimates", "Status", "Source"], trend_title),
                "trend": f15.table(trend_title, ["Date", "Rating", "Target", "Move"], "STREET VS OUR VIEW"),
                "streetVsOurs": f15.table("STREET VS OUR VIEW", ["Topic", "Street", "Ours"], "WHAT THEY MAY KNOW THAT WE DO NOT"),
                "whatTheyMayKnow": f15.table("WHAT THEY MAY KNOW THAT WE DO NOT", ["Item", "Why it matters"], search),
                "searchNote": search,
            },
            "f16": olectra_f16(),
        },
    )


# ---------------------------------------------------------------- HFCL (standalone HTML)

VOID = {"meta", "br", "hr", "img", "link", "input", "wbr"}


class Node:
    def __init__(self, tag, attrs=()):
        self.tag, self.attrs, self.kids = tag, dict(attrs), []

    def text(self):
        return "".join(k if isinstance(k, str) else k.text() for k in self.kids)

    def els(self, *tags):
        return [k for k in self.kids if isinstance(k, Node) and (not tags or k.tag in tags)]

    def find_all(self, tag):
        found = []
        for k in self.els():
            if k.tag == tag:
                found.append(k)
            found += k.find_all(tag)
        return found

    def css(self):
        return self.attrs.get("class", "")


class Tree(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = Node("root")
        self.stack = [self.root]

    def handle_starttag(self, tag, attrs):
        node = Node(tag, attrs)
        self.stack[-1].kids.append(node)
        if tag not in VOID:
            self.stack.append(node)

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        while self.stack[-1].tag != tag:
            self.stack.pop()
        self.stack.pop()

    def handle_data(self, data):
        self.stack[-1].kids.append(data)


def clean(node):
    return node.text().strip()


def html_table(box):
    t = box.find_all("table")[0]
    head = [clean(c) for c in t.find_all("th")]
    rows = [[clean(c) for c in r.els("td")] for r in t.find_all("tr") if r.els("td")]
    return head, rows


class Panel:
    """Tracks which boxes and loose paragraphs were used; the rest become gap notes."""

    def __init__(self, section):
        self.section = section
        self.lead = clean(section.els("h2")[0]) if section.els("h2") else None
        lead_box = next((d for d in section.els("div") if "takeaways" in d.css()), None)
        self.takeaways = [re.sub(r"^\d+\.\s*", "", clean(d)) for d in lead_box.els("div")] if lead_box else []
        self.loose = [clean(p) for p in section.els("p")]
        self.boxes = {clean(b.els("h3")[0]): b for b in section.els("div") if b.css() == "box"}
        self.used = set()

    def box(self, prefix):
        title = next(t for t in self.boxes if t.startswith(prefix))
        self.used.add(title)
        return title, self.boxes[title].els("div")[0]

    def table(self, prefix, columns=None):
        title, inside = self.box(prefix)
        head, rows = html_table(inside)
        if columns is None:
            columns = head
        return tbl(title, columns, rows)

    def take_loose(self, start):
        i = next(i for i, p in enumerate(self.loose) if p.startswith(start))
        return self.loose.pop(i)

    def base(self, extra_gaps=()):
        _, inside = self.box("SOURCES & GAPS")
        lines = [clean(p) for p in inside.els("p")]
        assert lines[-1].startswith("FACT=") and lines[-1].endswith(DISCLAIMER)
        src = next(l for l in lines if re.match(r"S\d+ ", l))
        gaps = [l for l in lines[:-1] if l != src]
        leftovers = [leftover(t, b.els("div")[0]) for t, b in self.boxes.items() if t not in self.used]
        gaps += [*extra_gaps, *leftovers, *self.loose]
        return {"leadTitle": self.lead, "takeaways": self.takeaways, "sourcesAndGaps": {"sources": src.split(" · "), "estDefinition": lines[-1].removesuffix(DISCLAIMER).strip(), "gaps": gaps, "disclaimer": DISCLAIMER}}


def leftover(title, inside):
    parts = [clean(p) for p in inside.els("p")]
    if inside.find_all("table"):
        parts += [": ".join(r) for r in html_table(inside)[1]]
    return f"Source section with no v1 slot, {title}: " + " | ".join(parts)


def x_suffix(text):
    return re.sub(r"(\d) x\b", r"\1x", text)


def after_h4(inside, heading):
    kids = inside.els()
    i = next(i for i, k in enumerate(kids) if k.tag == "h4" and clean(k) == heading)
    return kids[i + 1]


def items_or_text(node):
    return [clean(li) for li in node.els("li")] if node.tag == "ul" else [clean(node)]


def hfcl_f2(p):
    _, inside = p.box("FORENSIC & BALANCE SHEET")
    verdict, dedupe = (clean(x) for x in inside.els("p"))
    tally_line = p.take_loose("31 checks")
    tally, why = tally_line.split(" Why: ")
    categories, unscored = [], []
    summaries = [x for x in p.loose if not x.startswith("SUB-TABS")]
    for k, name in enumerate(CATEGORIES):
        title, box = p.box(f"{name} · ")
        counts = re.search(r"(\d+)R (\d+)A (\d+)G (\d+)U", title)
        head, rows = html_table(box)
        scored = [r for r in rows if r[3] != "U"]
        unscored += [f"{r[0]} {r[2]}" for r in rows if r[3] == "U"]
        r_, a, g, u = (int(x) for x in counts.groups())
        assert head == F2_COLUMNS and u == len(rows) - len(scored), name
        categories.append({"name": name, "counts": {"r": r_, "a": a, "g": g, "u": u}, "summary": summaries[k], "checks": tbl(name, F2_COLUMNS, scored)})
    p.loose = [x for x in p.loose if x not in summaries]
    data_gaps = p.table("DATA GAPS")  # before base(), which collects unused boxes as leftovers
    return {
        **p.base([f"Thresholds of the U checks, which leave the check tables for DATA GAPS: {'; '.join(unscored)}."]),
        "combinedVerdict": verdict,
        "deduplicationNote": dedupe,
        # The sample has no separate stress headline, so its lead title serves as one.
        "stress": {"headline": p.lead, "why": why, "tally": tally},
        "categories": categories,
        "dataGaps": data_gaps,
    }


def hfcl_f4(p):
    signal = p.table("SIGNAL STRIP")
    limited = [r[0] for r in signal["rows"] if r[2] == "GREEN (limited)"]
    for r in signal["rows"]:
        if r[2] == "GREEN (limited)":
            r[2] = "GREEN"
    banner, inside = p.box("MANAGEMENT CHANGE & CULTURE")
    _, lit = p.box("WHAT THE LITERATURE SAYS")
    return {
        "ownership": p.table("OWNERSHIP"),
        "managementChange": {"banner": banner, "summary": clean(inside.els("p")[0])},
        "changeLog": p.table("KEY-PERSON CHANGE LOG"),
        "signalStrip": signal,
        "cultureStrip": p.table("CULTURE STRIP"),
        "literature": [clean(li) for li in lit.find_all("li")],
        "_gaps": [f"Source flags GREEN (limited) on: {', '.join(limited)}. The schema allows only GREEN here."],
    }


def hfcl_f5(p):
    banner, inside = p.box("INDUSTRY / THEME SENTIMENT")
    mood, plain = clean(inside.els("p")[0]).split(". ", 1)
    _, narr = p.box("3 NARRATIVES")
    return {
        "themeBanner": banner,
        "themeMood": mood,
        "plainRead": plain,
        "themeStrip": p.table("THEME STRIP"),
        "narratives": [clean(li) for li in narr.find_all("li")],
        "methodNote": "U",
        "stockMood": p.table("STOCK MOOD"),
    }


def hfcl_f9(p):
    _, key = p.box("KEY TAKEAWAYS")
    _, bridge = p.box("GUIDANCE / DISCLOSURE BRIDGE")
    _, rows = html_table(bridge)
    _, delta = p.box("(A) DELTA VS LAST CALL")
    _, lang = p.box("(B) LANGUAGE SIGNALS")
    _, score = p.box("CALL LANGUAGE SCORECARD")
    _, action = p.box("(C) ACTIONABLE")
    nested = {clean(b.els("h3")[0]): b.els("div")[0] for b in action.els("div") if b.css() == "box"}
    return {
        "keyTakeawaysNote": clean(key.els("p")[0]),
        "guidance": tbl("KEY TAKEAWAYS", ["", "What was said", "Number", "Tag", "So what (price ranges)"], rows),
        "delta": {
            "new": items_or_text(after_h4(delta, "NEW")),
            "droppedOrGoneQuiet": items_or_text(after_h4(delta, "DROPPED / GONE QUIET")),
            "guidanceRaisedCut": items_or_text(after_h4(delta, "GUIDANCE RAISED / CUT")),
        },
        "language": {
            "confidenceScore": "U",
            "confidenceNote": "U",
            "hedgingVsCertainty": clean(after_h4(lang, "HEDGING VS CERTAINTY")),
            "evasiveAnswers": items_or_text(after_h4(lang, "EVASIVE ANSWERS")),
            "analystPushbackTopics": items_or_text(after_h4(lang, "ANALYST PUSHBACK TOPICS")),
        },
        "callLanguageScorecard": {"reading": "U", "note": clean(score.els("p")[0]).removeprefix("U: ")},
        "whatToWatch": tbl("WHAT TO WATCH NEXT QUARTER", ["KPI", "Threshold (good / bad)"], html_table(nested["WHAT TO WATCH NEXT QUARTER"])[1]),
        "thesisImpact": tbl("THESIS IMPACT", ["Tab", "Effect", "Why"], html_table(nested["THESIS IMPACT"])[1]),
    }


def hfcl_f10(p):
    strip, rr = p.box("Reward : risk")
    _, ladder = p.box("PRICE LADDER")
    _, need = p.box("WHAT WOULD NEED TO HAPPEN")
    weighted, method = (clean(x) for x in need.els("p"))
    rungs = [{"label": clean(r.els("span")[0]), "value": clean(r.els("strong")[0])} for r in ladder.els("div")]
    return {
        "rewardRisk": {"strip": x_suffix(strip), "detail": clean(rr.els("p")[0])},
        "scenarios": p.table("SCENARIOS"),
        "priceLadder": rungs,
        "whatWouldNeedToHappen": [clean(li) for li in need.find_all("li")],
        "weightedTarget": weighted,
        "methodDetail": method.removeprefix("Method detail: "),
    }


def hfcl_f12(p):
    rev = p.table("REVENUE SCENARIOS")
    rev["title"] = x_suffix(rev["title"])
    return {"costSplit": p.table("COST SPLIT"), "revenueScenarios": rev, "marginShock": p.table("MARGIN SHOCK")}


def hfcl_f13(p):
    _, cons = p.box("CONSENSUS")
    line = clean(cons.els("p")[0])
    counts = re.match(r"(\d+) Would buy ·(\d+) Watchlist ·(\d+) Pass ·(.+)", line)
    investors = []
    for name in INVESTORS:
        title, inside = p.box(f"{name} · ")
        paras = [clean(x) for x in inside.els("p")]
        _, rows = html_table(inside)
        investors.append(
            {
                "name": name,
                "stance": title.split(" · ")[1],
                "criteriaLine": paras[0].removeprefix("Criteria: "),
                "criteria": [{"mark": m, "label": l, "evidence": e} for m, l, e in rows],
                "quote": paras[1],
            }
        )
    legend = p.take_loose("✓ pass")
    return {
        "consensus": {"wouldBuy": int(counts[1]), "watchlist": int(counts[2]), "pass": int(counts[3]), "note": counts[4]},
        "keyDisagreement": "U",
        "tieBreaker": "U",
        "investors": investors,
        "methodologyNote": legend,
    }


def hfcl_f14(p):
    meter = p.table("EXTENSION METER", ["", ""])
    title, inside = p.box("STAGED ENTRY")
    head, rows = html_table(inside)
    assert head[:2] == ["Tranche", "Size%"]
    _, rules = p.box("RULES")
    parsed = []
    for li in rules.find_all("li"):
        label, body = clean(li).split(":", 1)
        parsed.append({"label": label, "text": body.strip()})
    return {
        "state": "U",
        "priceLine": "U",
        "todaysAction": "U",
        "extensionMeter": meter,
        # The source splits tranche and size; the schema's first position holds both.
        "stagedEntry": tbl(title, ["", "", "", ""], [[f"{r[0]} {r[1]}", *r[2:]] for r in rows]),
        "size": "U",
        "rules": parsed,
        "frameworkNote": "U",
    }


def hfcl_f15(p):
    return {
        "consensusStrip": p.table("CONSENSUS STRIP"),
        "calls": p.table("CALLS FOUND"),
        "trend": p.table("TREND ("),
        "streetVsOurs": p.table("STREET VS OUR VIEW"),
        "whatTheyMayKnow": p.table("WHAT THEY MAY KNOW"),
        "searchNote": "U",
    }


def hfcl_f16(p):
    banner, inside = p.box("STAKEHOLDER STRIP")
    paras = [clean(x) for x in inside.els("p")]
    _, risks = p.box("TOP 3 HIDDEN RISKS")
    lenses = []
    for k, name in enumerate(LENSES):
        title, box = p.box(f"{k + 1} {name} · ")
        m = re.fullmatch(r"\d+ .+ · (GREEN|AMBER|RED|NO DATA) · (multiple .+)", title)
        who, evidence, hidden = (clean(x) for x in box.els("p"))
        lenses.append({"name": name, "flag": m[1], "multiple": x_suffix(m[2]), "who": who.removeprefix("Who: "), "evidence": evidence.removeprefix("Evidence: "), "hiddenRisk": hidden.removeprefix("Hidden risk: ")})
    return {
        "stripBanner": x_suffix(banner),
        "adjustedMultiple": paras[1],
        "topHiddenRisks": [clean(li) for li in risks.find_all("li")],
        "lenses": lenses,
        "wantsNote": p.take_loose("Stakeholder wants"),
        "_gaps": [paras[2]],
    }


def merge(panel, body):
    """Body first: its boxes must be marked used before base() collects the leftovers."""
    extra = body.pop("_gaps", [])
    return {**panel.base(extra), **body}


def build_hfcl():
    tree = Tree()
    tree.feed((REF / "hfcl-research-sample.html").read_text(encoding="utf-8", errors="replace"))
    main = tree.root.find_all("main")[0]
    panels = {s.attrs["id"]: Panel(s) for s in main.find_all("section")}
    p = {k.lower(): v for k, v in panels.items()}

    p1 = p["f1"]
    _, top = p1.box("TOP 3 INSIGHTS")
    f1_extra = [clean(next(d for d in main.els("div") if d.css() == "notice"))]
    f17 = p["f17"]
    f1_extra.append("F17 source body, kept out because F17 is upload-only: " + " ".join(clean(b.els("div")[0]) for t, b in f17.boxes.items() if not t.startswith("SOURCES")))

    f2 = hfcl_f2(p["f2"])
    f3_score = p["f3"].table("SCORECARD (EST)")
    p7, p8 = p["f7"], p["f8"]
    grid = p["f11"].table("LEIBOWITZ GRID")
    assert grid["columns"][0] == "k \\ R"
    grid["columns"][0] = LEIBOWITZ_K

    chips = {clean(c.els("span")[0]): clean(c.els("strong")[0]) for c in next(d for d in main.els("div") if d.css() == "chips").els("div")}
    footer = clean(main.els("footer")[0])
    m = re.fullmatch(r"Paper analysis only, not advice\. As of (.+?) ·price (.+?) ·(.+?)\. (EST scenarios/Ugaps\. .+)", footer)

    return envelope(
        {
            "kicker": clean(next(d for d in main.els("div") if d.css() == "kicker")),
            "companyLine": clean(main.els("h1")[0]),
            "thesis": clean(main.els("p")[0]),
            "ratingPaper": chips["Rating (paper)"],
            "target": chips["Target"],
            "price": chips["Price"],
        },
        {"asOfIst": m[1], "priceDate": m[2], "sourcesSummary": m[3], "estUDisclaimer": m[4]},
        {
            "f1": {**p1.base(f1_extra), "topInsights": [clean(li) for li in top.find_all("li")]},
            "f2": f2,
            "f3": merge(p["f3"], {"scorecard": f3_score}),
            "f4": merge(p["f4"], hfcl_f4(p["f4"])),
            "f5": merge(p["f5"], hfcl_f5(p["f5"])),
            "f6": merge(p["f6"], {"bottomUp": p["f6"].table("FY27E BOTTOM-UP"), "orderBook": p["f6"].table("ORDER BOOK"), "structure": p["f6"].table("HFCL / SUBSIDIARY STRUCTURE")}),
            "f7": merge(p7, {"pl": p7.table("P&L (")}),
            "f8": merge(p8, {"returns": p8.table("RETURNS")}),
            "f9": merge(p["f9"], hfcl_f9(p["f9"])),
            "f10": merge(p["f10"], hfcl_f10(p["f10"])),
            "f11": merge(p["f11"], {"grid": grid}),
            "f12": merge(p["f12"], hfcl_f12(p["f12"])),
            "f13": merge(p["f13"], hfcl_f13(p["f13"])),
            "f14": merge(p["f14"], hfcl_f14(p["f14"])),
            "f15": merge(p["f15"], hfcl_f15(p["f15"])),
            "f16": merge(p["f16"], hfcl_f16(p["f16"])),
        },
    )


# ---------------------------------------------------------------- XSS probe (no research data)


def build_xss():
    script = "<script>alert('xss-script')</script>"
    img = '<img src=x onerror="alert(\'xss-img\')">'
    attr = '"><svg onload=alert(1)>'
    entity = "&lt;script&gt;alert('xss-entity')&lt;/script&gt; & <b>bold</b>"
    u = "U"
    base = {"leadTitle": script, "takeaways": [img], "sourcesAndGaps": {"sources": [attr], "estDefinition": entity, "gaps": [script], "disclaimer": DISCLAIMER}}
    empty = lambda title, cols, rows=(): tbl(title, cols, list(rows))
    return envelope(
        {"kicker": f"EQUITY RESEARCH · {script} · AS OF {attr} · PAPER ANALYSIS ONLY, NOT ADVICE", "companyLine": "<img src=x onerror=alert(1)> (NSE: XSS)", "thesis": script, "ratingPaper": u, "target": "₹<script>alert(1)</script>", "price": "₹<b>1</b> (<script>alert(1)</script>)"},
        {"asOfIst": script, "priceDate": img, "sourcesSummary": attr, "estUDisclaimer": entity},
        {
            "f1": {**base, "topInsights": [script, img, attr]},
            "f2": {
                **base,
                "combinedVerdict": script,
                "deduplicationNote": img,
                "stress": {"headline": attr, "why": entity, "tally": f"31 checks: 0 RED · 0 AMBER · 0 GREEN · 31 not checked {script}"},
                "categories": [{"name": n, "counts": {"r": 0, "a": 0, "g": 0, "u": 0}, "summary": img, "checks": empty(script, F2_COLUMNS, [["1.1", script, img, "RED", attr]])} for n in CATEGORIES],
                "dataGaps": empty("DATA GAPS · 1 CHECKS NOT SCORED", ["#", "Check", "Category", "What is missing"], [["6.2", script, CATEGORIES[0], img]]),
            },
            "f3": {**base, "scorecard": empty("SCORECARD (EST)", ["Model", "Score", "Read"], [[script, img, attr]])},
            "f4": {
                **base,
                "ownership": empty("OWNERSHIP", ["Item", "Value"], [[script, img]]),
                "managementChange": {"banner": f"MANAGEMENT CHANGE & CULTURE · VERDICT: {script} · public data only, not advice", "summary": img},
                "changeLog": empty(f"KEY-PERSON CHANGE LOG ({script})", ["Date", "Person", "Role", "In/Out", "Stated reason / profile", "AR 0/+1", "AR 20d"]),
                "signalStrip": empty("SIGNAL STRIP", ["Signal", "Reading", "Flag"], [[script, img, "NO DATA"]]),
                "cultureStrip": empty(f"CULTURE STRIP (checked {script})", ["Source", "Reading", "Note"]),
                "literature": [script],
            },
            "f5": {**base, "themeBanner": f"INDUSTRY / THEME SENTIMENT · {script} · {img}", "themeMood": script, "plainRead": img, "themeStrip": empty("THEME STRIP (EST where marked)", ["Signal", "Reading", "Read"]), "narratives": [script, img, attr], "methodNote": entity, "stockMood": empty(f"STOCK MOOD ({script})", ["Signal", "Reading"])},
            "f6": {**base, "bottomUp": empty("FY27E BOTTOM-UP REVENUE (₹ cr, EST)", ["Line", "FY27E", "Basis"]), "orderBook": empty(f"ORDER BOOK ({script})", ["Order", "Size", "Delivered", "Status"]), "structure": empty(f"{script} STRUCTURE", ["Entity", "Role"], [[script, img]])},
            "f7": {**base, "pl": empty("P&L (₹ cr, consolidated)", ["", "FY23", "FY24", "FY25", "FY26", "TTM", "FY27E", "FY28E"], [[script, u, u, u, u, u, u, img]])},
            "f8": {**base, "returns": empty("RETURNS", ["Metric", "Value"], [[script, img]])},
            "f9": {
                **base,
                "keyTakeawaysNote": script,
                "guidance": empty("KEY TAKEAWAYS", ["", "What was said", "Number", "Tag", "So what (price ranges)"]),
                "delta": {"new": [script], "droppedOrGoneQuiet": [img], "guidanceRaisedCut": [attr]},
                "language": {"confidenceScore": script, "confidenceNote": img, "hedgingVsCertainty": attr, "evasiveAnswers": [script], "analystPushbackTopics": [img]},
                "callLanguageScorecard": {"reading": script, "note": img},
                "whatToWatch": empty("WHAT TO WATCH NEXT QUARTER", ["KPI", "Threshold (good / bad)"]),
                "thesisImpact": empty("THESIS IMPACT", ["Tab", "Effect", "Why"]),
            },
            "f10": {**base, "rewardRisk": {"strip": "Reward : risk U", "detail": script}, "scenarios": empty("SCENARIOS: one row per independent lens", ["Lens", "Scenario", "Price", "vs now", "What it tells you"]), "priceLadder": [{"label": script, "value": img}, {"label": "◆ CURRENT PRICE", "value": attr}], "whatWouldNeedToHappen": [script], "weightedTarget": img, "methodDetail": attr},
            "f11": {**base, "grid": empty(f"LEIBOWITZ GRID ({script})", [LEIBOWITZ_K, "R <b>%", "Today %"], [[script, img, attr]])},
            "f12": {**base, "costSplit": empty("COST SPLIT (EST)", ["Item", "Value", "Method"]), "revenueScenarios": empty(f"REVENUE SCENARIOS ON TTM COST STRUCTURE (₹ cr, EST; value at {script}x)", ["Revenue Δ", "Revenue", "EBITDA", "Margin", "EBIT", "PAT", "EPS ₹", "Value ₹"]), "marginShock": empty("MARGIN SHOCK (revenue held at TTM)", ["EBITDA margin", "EPS", "Value @<b>x"])},
            "f13": {
                **base,
                "leadTitle": f"{script} 0 would buy / 0 watchlist / 0 pass",
                "consensus": {"wouldBuy": 0, "watchlist": 0, "pass": 0, "note": script},
                "keyDisagreement": img,
                "tieBreaker": attr,
                "investors": [{"name": n, "stance": u, "criteriaLine": script, "criteria": [{"mark": "✗", "label": img, "evidence": attr}], "quote": script} for n in INVESTORS],
                "methodologyNote": entity,
            },
            "f14": {**base, "state": script, "priceLine": img, "todaysAction": attr, "extensionMeter": empty("EXTENSION METER", ["", ""], [[script, img]]), "stagedEntry": empty("STAGED ENTRY (3 TRANCHES)", ["", "", "", ""], [[script, img, attr, entity]]), "size": script, "rules": [{"label": script, "text": img}], "frameworkNote": attr},
            "f15": {
                **base,
                "consensusStrip": empty(f"CONSENSUS STRIP · HEADLINE-LEVEL, REPORTS NOT READ IN FULL · price {script}", ["Metric", "Value", "Note"]),
                "calls": empty(f"CALLS FOUND ({script})", ["Date", "Broker", "Type", "Rating", "Target", "Upside", "Thesis / estimates", "Status", "Source"]),
                "trend": empty(f"TREND ({script} TARGET HISTORY)", ["Date", "Rating", "Target", "Move"]),
                "streetVsOurs": empty("STREET VS OUR VIEW", ["Topic", "Street", "Ours"]),
                "whatTheyMayKnow": empty("WHAT THEY MAY KNOW THAT WE DO NOT", ["Item", "Why it matters"]),
                "searchNote": script,
            },
            "f16": {**base, "stripBanner": f"STAKEHOLDER STRIP · base P/E ~{script}x · EST, not advice", "adjustedMultiple": script, "topHiddenRisks": [img], "lenses": [{"name": n, "flag": "NO DATA", "multiple": u, "who": script, "evidence": img, "hiddenRisk": attr} for n in LENSES], "wantsNote": entity},
        },
    )


if __name__ == "__main__":
    write("olectra", build_olectra())
    write("hfcl", build_hfcl())
    write("xss-probe", build_xss())
