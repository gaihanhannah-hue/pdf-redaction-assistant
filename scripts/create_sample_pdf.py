from pathlib import Path

from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "sample-sensitive-document.pdf"


def draw_page(c: canvas.Canvas, title: str, lines: list[str]) -> None:
    width, height = letter
    c.setFont("Helvetica-Bold", 16)
    c.drawString(72, height - 72, title)
    c.setFont("Helvetica", 11)
    y = height - 112
    for line in lines:
        c.drawString(72, y, line)
        y -= 24
    c.showPage()


def main() -> None:
    OUT.parent.mkdir(parents=True, exist_ok=True)
    c = canvas.Canvas(str(OUT), pagesize=letter)

    draw_page(
        c,
        "Review Memo - Client Intake",
        [
            "Prepared by John Smith on 12/01/2024 for internal review.",
            "John Smith called Alice Wong at (415) 555-0198 on 12/01/2024.",
            "Alice Wong met with Mary O'Brien on January 12, 2024.",
            "Mary O'Brien confirmed that John Smith can be reached at (415) 555-0198.",
            "Client phone: (415) 555-0198.",
            "Follow-up was scheduled for 2024-01-19.",
            "The reviewer should confirm whether these names require redaction.",
        ],
    )
    draw_page(
        c,
        "Case Timeline",
        [
            "Dr. Robert Chen submitted an update on 03-Feb-2024.",
            "The next interview with Olivia Brown is planned for 12 January 2024.",
            "Robert Chen called Alice Wong from +44 20 7946 0958.",
            "Emergency contact: +44 20 7946 0958.",
            "The team reused 03-Feb-2024 as the review milestone for John Smith.",
            "A separate notice was dated 12-02-2024.",
            "Search terms such as Alice or Chen should highlight across the document.",
        ],
    )
    draw_page(
        c,
        "Reviewer Notes",
        [
            "No backend service is required for this review workflow.",
            "John Smith and Alice Wong appear again for repeated-name testing.",
            "The date 12/01/2024 appears again for repeated-date testing.",
            "The phone number (415) 555-0198 appears again for repeated-phone testing.",
            "False positives should be treated as review candidates, not final decisions.",
            "The entity panel helps reviewers jump to each sensitive-looking item.",
        ],
    )

    c.save()
    print(OUT)


if __name__ == "__main__":
    main()
