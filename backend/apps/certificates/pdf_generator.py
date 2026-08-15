import io
from reportlab.lib.pagesizes import landscape, letter
from reportlab.lib import colors
from reportlab.pdfgen import canvas

def generate_certificate_pdf_bytes(cert_code, student_name, course_title, issued_date):
    """
    Generates a high-resolution, vector-rendered Certificate of Completion in PDF format.
    """
    buffer = io.BytesIO()
    # Landscape Letter: 11 x 8.5 inches (792 x 612 pt)
    c = canvas.Canvas(buffer, pagesize=landscape(letter))
    width, height = landscape(letter)

    # 1. Dark Modern Background
    c.setFillColor(colors.HexColor('#0b0f19'))
    c.rect(0, 0, width, height, fill=1, stroke=0)

    # 2. Outer Golden & Cyan Borders
    c.setStrokeColor(colors.HexColor('#f59e0b'))
    c.setLineWidth(3.5)
    c.rect(20, 20, width - 40, height - 40)

    c.setStrokeColor(colors.HexColor('#06b6d4'))
    c.setLineWidth(1)
    c.rect(26, 26, width - 52, height - 52)

    # 3. Academy Header Branding
    c.setFillColor(colors.HexColor('#06b6d4'))
    c.setFont("Helvetica-Bold", 13)
    c.drawCentredString(width / 2.0, height - 65, "APEX LEARNING ACADEMY")

    c.setFillColor(colors.HexColor('#94a3b8'))
    c.setFont("Helvetica", 8)
    c.drawCentredString(width / 2.0, height - 80, "VERIFIED ACADEMIC & PROFESSIONAL CREDENTIAL")

    # 4. Main Certificate Title
    c.setFillColor(colors.HexColor('#ffffff'))
    c.setFont("Helvetica-Bold", 26)
    c.drawCentredString(width / 2.0, height - 130, "CERTIFICATE OF ACHIEVEMENT")

    # 5. Subtitle
    c.setFillColor(colors.HexColor('#94a3b8'))
    c.setFont("Helvetica-Oblique", 11)
    c.drawCentredString(width / 2.0, height - 165, "This is proudly presented to")

    # 6. Student Name
    c.setFillColor(colors.HexColor('#38bdf8'))
    c.setFont("Helvetica-Bold", 22)
    c.drawCentredString(width / 2.0, height - 205, str(student_name).strip().upper())

    # 7. Reason Text
    c.setFillColor(colors.HexColor('#cbd5e1'))
    c.setFont("Helvetica", 10)
    c.drawCentredString(width / 2.0, height - 245, "for successfully completing the required coursework, checkpoint quizzes, and projects in")

    # 8. Course Title
    c.setFillColor(colors.HexColor('#f59e0b'))
    c.setFont("Helvetica-Bold", 17)
    c.drawCentredString(width / 2.0, height - 280, f'"{str(course_title).strip()}"')

    # 9. Gold Seal Emblem (Center-Bottom)
    c.setStrokeColor(colors.HexColor('#f59e0b'))
    c.setLineWidth(1.5)
    c.circle(width / 2.0, height - 370, 30, fill=0, stroke=1)
    c.setFillColor(colors.HexColor('#fef08a'))
    c.setFont("Helvetica-Bold", 8)
    c.drawCentredString(width / 2.0, height - 365, "VERIFIED")
    c.drawCentredString(width / 2.0, height - 377, "APEX SEAL")

    # 10. Left & Right Signatures & IDs
    c.setFillColor(colors.HexColor('#94a3b8'))
    c.setFont("Helvetica", 9)
    c.drawString(55, 75, f"Issued Date: {issued_date}")
    c.drawString(55, 60, f"Credential ID: {cert_code}")

    c.drawRightString(width - 55, 75, "Authorized by: Apex Academic Board")
    c.drawRightString(width - 55, 60, "Hadescore Technologies LMS")

    # Finalize Page
    c.showPage()
    c.save()
    buffer.seek(0)
    return buffer.getvalue()
