"""
Generates the three sample lectures in ../samples (already included in the repo).
Only needed if you want to change them:

    pip install reportlab python-pptx
    python scripts/make_samples.py
"""
from pathlib import Path

from pptx import Presentation
from pptx.util import Pt
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle
from reportlab.lib import colors

OUT = Path(__file__).resolve().parent.parent / "samples"
OUT.mkdir(exist_ok=True)


# ───────────────────────── 1. PDF: Computer Networks ─────────────────────────
def make_pdf():
    styles = getSampleStyleSheet()
    h1 = styles["Title"]
    h2 = ParagraphStyle("h2", parent=styles["Heading2"], textColor=colors.HexColor("#1E7A4C"))
    body = ParagraphStyle("body", parent=styles["BodyText"], fontSize=11, leading=15)
    bullet = ParagraphStyle("bullet", parent=body, leftIndent=14, bulletIndent=4)

    def bullets(items):
        return [Paragraph(i, bullet, bulletText="•") for i in items]

    story = [
        Paragraph("Computer Networks — Lecture 3", h1),
        Paragraph("The OSI and TCP/IP Models: how data travels across a network", styles["Heading3"]),
        Spacer(1, 0.4 * cm),
        Paragraph("1. Why do we need network models?", h2),
        Paragraph(
            "Sending a message from one computer to another involves many problems at once: turning bits into "
            "electrical or radio signals, finding a path through many routers, recovering from lost packets and "
            "presenting data to the right application. Network models split this big problem into <b>layers</b>. "
            "Each layer solves one problem and offers a service to the layer above it. Engineers can change one "
            "layer (for example, replace Wi-Fi with fibre) without rewriting the others.",
            body,
        ),
        Paragraph("2. The seven layers of the OSI model", h2),
    ]
    table = Table(
        [
            ["#", "Layer", "Job", "Examples", "Data unit"],
            ["7", "Application", "Services for user programs", "HTTP, DNS, SMTP, FTP", "Data"],
            ["6", "Presentation", "Format, encrypt, compress", "TLS, JPEG, UTF-8", "Data"],
            ["5", "Session", "Open / manage / close sessions", "RPC, NetBIOS", "Data"],
            ["4", "Transport", "End-to-end delivery, ports", "TCP, UDP", "Segment"],
            ["3", "Network", "Logical addressing, routing", "IP, ICMP, OSPF", "Packet"],
            ["2", "Data Link", "Delivery on one link, MAC addresses", "Ethernet, Wi-Fi (802.11)", "Frame"],
            ["1", "Physical", "Bits as signals", "Cables, fibre, radio", "Bit"],
        ],
        colWidths=[0.8 * cm, 2.6 * cm, 5.2 * cm, 4.4 * cm, 2.2 * cm],
    )
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1E7A4C")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#BBBBBB")),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ]
        )
    )
    story += [
        table,
        Spacer(1, 0.3 * cm),
        Paragraph("Memory trick (top to bottom): <i>All People Seem To Need Data Processing</i>.", body),
        Paragraph("3. The TCP/IP model", h2),
        Paragraph(
            "The Internet actually uses the simpler TCP/IP model with four layers. It merges OSI layers 5–7 into one "
            "Application layer and layers 1–2 into the Link (Network Access) layer.",
            body,
        ),
        *bullets(
            [
                "<b>Application</b> — HTTP, HTTPS, DNS, SMTP, SSH",
                "<b>Transport</b> — TCP and UDP, identified by port numbers (e.g. 80 for HTTP, 443 for HTTPS, 53 for DNS)",
                "<b>Internet</b> — IP addressing and routing (IPv4, IPv6)",
                "<b>Link</b> — Ethernet, Wi-Fi, and the physical medium",
            ]
        ),
        PageBreak(),
        Paragraph("4. Encapsulation", h2),
        Paragraph(
            "When you send data, each layer adds its own <b>header</b> in front of the data from the layer above. "
            "This is called encapsulation. The receiver removes the headers in reverse order (decapsulation).",
            body,
        ),
        *bullets(
            [
                "Application data: GET /index.html",
                "Transport adds a TCP header (source port, destination port, sequence number) → segment",
                "Network adds an IP header (source IP, destination IP, TTL) → packet",
                "Data link adds a frame header with MAC addresses and a trailer with a checksum (FCS) → frame",
                "Physical layer sends the frame as bits",
            ]
        ),
        Paragraph("5. TCP vs UDP", h2),
        Paragraph(
            "<b>TCP</b> (Transmission Control Protocol) is connection-oriented and reliable: it numbers bytes, "
            "acknowledges what was received, retransmits lost segments, keeps order and controls the sending speed "
            "(flow and congestion control). It is used for web pages, e-mail and file transfer.",
            body,
        ),
        Paragraph(
            "<b>UDP</b> (User Datagram Protocol) is connectionless: no handshake, no acknowledgements, no ordering. "
            "Its header is only 8 bytes, so it is fast and has low delay. It is used for video calls, online games, "
            "live streaming and DNS queries, where speed matters more than perfect delivery.",
            body,
        ),
        Paragraph("6. The TCP three-way handshake", h2),
        *bullets(
            [
                "<b>SYN</b>: the client sends a segment with the SYN flag and its initial sequence number x",
                "<b>SYN-ACK</b>: the server replies with SYN and ACK = x + 1 and its own sequence number y",
                "<b>ACK</b>: the client sends ACK = y + 1. The connection is now established",
            ]
        ),
        Paragraph("A connection is closed with FIN and ACK segments from both sides (four-way termination).", body),
        Paragraph("7. Example: what happens when you open https://example.com", h2),
        *bullets(
            [
                "DNS (application layer, usually over UDP port 53) translates example.com into an IP address",
                "The browser opens a TCP connection to port 443 using the three-way handshake",
                "TLS (presentation) negotiates encryption keys",
                "HTTP sends GET / and the server returns the HTML page",
                "Routers forward the IP packets hop by hop; switches deliver frames using MAC addresses",
            ]
        ),
        Paragraph("8. Key points for the exam", h2),
        *bullets(
            [
                "Name the seven OSI layers in order and give one protocol for each",
                "Compare the OSI and TCP/IP models",
                "Explain encapsulation and name the data unit at each layer",
                "Compare TCP and UDP and give suitable applications",
                "Describe the three-way handshake with sequence and acknowledgement numbers",
            ]
        ),
    ]
    SimpleDocTemplate(str(OUT / "01-computer-networks-osi-model.pdf"), pagesize=A4, title="Computer Networks — Lecture 3").build(story)


# ───────────────────────── 2. PPTX: Sorting Algorithms ─────────────────────────
def make_pptx():
    prs = Presentation()
    slides = [
        ("Algorithms — Lecture 5: Sorting Algorithms", None,
         "Today we compare five classic sorting algorithms and their time complexity.", True),
        ("Why sorting matters",
         ["Sorted data makes searching fast: binary search is O(log n)",
          "Used in databases (ORDER BY), leaderboards, file explorers",
          "Sorting is a classic way to study algorithm complexity",
          "Key questions: How fast? How much memory? Is it stable?"],
         "Stable means equal elements keep their original order.", False),
        ("Bubble sort",
         ["Repeatedly compare neighbours and swap if they are in the wrong order",
          "After pass k, the k largest elements are in their final place",
          "Best case O(n) with early exit, average and worst O(n²)",
          "In-place, stable, but slow for large n"],
         "Example: [5, 1, 4, 2] → [1, 4, 2, 5] after the first pass.", False),
        ("Selection sort and insertion sort",
         ["Selection: find the minimum of the unsorted part and swap it to the front — always O(n²), not stable",
          "Insertion: take the next element and insert it into the sorted left part — O(n) on nearly sorted data",
          "Insertion sort is used inside hybrid algorithms like Timsort for small parts"],
         None, False),
        ("Merge sort (divide and conquer)",
         ["Divide the array into two halves",
          "Sort each half recursively",
          "Merge the two sorted halves in linear time",
          "Always O(n log n); needs O(n) extra memory; stable"],
         "Recurrence: T(n) = 2T(n/2) + O(n), which gives O(n log n) by the master theorem.", False),
        ("Quicksort",
         ["Choose a pivot and partition: smaller elements left, larger elements right",
          "Recursively sort both parts",
          "Average O(n log n), worst case O(n²) when the pivot is always the smallest/largest",
          "In-place and very fast in practice; random pivot avoids the worst case"],
         "Lomuto and Hoare are two common partition schemes.", False),
        ("Complexity summary",
         ["Bubble: best O(n), average O(n²), worst O(n²), memory O(1), stable",
          "Selection: O(n²) in all cases, memory O(1), not stable",
          "Insertion: best O(n), average/worst O(n²), memory O(1), stable",
          "Merge: O(n log n) in all cases, memory O(n), stable",
          "Quick: average O(n log n), worst O(n²), memory O(log n), not stable"],
         "Comparison sorts cannot beat O(n log n) in the worst case.", False),
        ("Exam checklist",
         ["Trace each algorithm on a small array step by step",
          "State best, average and worst case complexity",
          "Explain why quicksort's worst case is O(n²)",
          "Write merge sort or insertion sort in Python or Java"],
         None, False),
    ]
    for title, points, notes, is_title in slides:
        if is_title:
            s = prs.slides.add_slide(prs.slide_layouts[0])
            s.shapes.title.text = title
            s.placeholders[1].text = "Department of Computer Science"
        else:
            s = prs.slides.add_slide(prs.slide_layouts[1])
            s.shapes.title.text = title
            tf = s.placeholders[1].text_frame
            tf.text = points[0]
            for p in points[1:]:
                para = tf.add_paragraph()
                para.text = p
            for para in tf.paragraphs:
                for r in para.runs:
                    r.font.size = Pt(20)
        if notes:
            s.notes_slide.notes_text_frame.text = notes
    prs.save(OUT / "02-sorting-algorithms.pptx")


# ───────────────────────── 3. VTT transcript: CPU ─────────────────────────
TRANSCRIPT = [
    "Good morning everyone. Today we look inside the processor and answer one question: how does a CPU actually run a program?",
    "A program is just a list of instructions stored in main memory, in RAM. The CPU reads them one by one and carries them out.",
    "Inside the CPU there are three main parts. The arithmetic logic unit, the ALU, does calculations like addition and comparisons.",
    "The control unit reads instructions and tells the other parts what to do. And the registers are tiny, very fast memory cells inside the CPU.",
    "Some registers have special jobs. The program counter, PC, holds the address of the next instruction.",
    "The current instruction register, CIR, holds the instruction that is being executed right now.",
    "The memory address register, MAR, holds an address we want to read or write, and the memory data register, MDR, holds the data that was read or will be written.",
    "The accumulator stores the results of calculations from the ALU.",
    "Now, the CPU repeats the same three steps billions of times per second. We call this the fetch decode execute cycle.",
    "Step one, fetch. The address in the program counter is copied to the MAR. The instruction at that address travels along the data bus into the MDR, and then it is copied into the CIR. The program counter is increased by one so it points to the next instruction.",
    "Step two, decode. The control unit looks at the instruction and splits it into the opcode, which says what to do, and the operand, which says what data or address to use.",
    "Step three, execute. The instruction is carried out. For example, ADD 5 makes the ALU add the value at address 5 to the accumulator. A jump instruction simply changes the program counter.",
    "Then the cycle starts again with the next fetch.",
    "Then the cycle starts again with the next fetch.",
    "So what makes a CPU faster? First, clock speed. A three gigahertz CPU has three billion clock ticks per second.",
    "Second, the number of cores. Each core can run its own fetch decode execute cycle, so a quad core CPU can work on four tasks at the same time.",
    "Third, cache. Cache is small, fast memory close to the CPU that stores recently used data, so the CPU waits less for RAM.",
    "For the exam, remember the order of the cycle, the job of each register, and the three factors that affect performance. Next week we will look at pipelining.",
]


def make_vtt():
    lines = ["WEBVTT", "Kind: captions", "Language: en", "", "NOTE Computer Architecture — Lecture 2 (auto-generated captions)", ""]
    t = 0.0

    def ts(s):
        h, rem = divmod(s, 3600)
        m, sec = divmod(rem, 60)
        return f"{int(h):02d}:{int(m):02d}:{sec:06.3f}"

    for i, sentence in enumerate(TRANSCRIPT, 1):
        dur = max(3.0, len(sentence.split()) * 0.42)
        lines += [str(i), f"{ts(t)} --> {ts(t + dur)}", f"<v Lecturer>{sentence}", ""]
        t += dur
    (OUT / "03-cpu-fetch-decode-execute.vtt").write_text("\n".join(lines), encoding="utf-8")


if __name__ == "__main__":
    make_pdf()
    make_pptx()
    make_vtt()
    print("Samples written to", OUT)
