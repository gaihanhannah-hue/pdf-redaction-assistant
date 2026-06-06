import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import { writeFileSync } from 'fs'

const doc = await PDFDocument.create()
const font = await doc.embedFont(StandardFonts.Helvetica)
const bold = await doc.embedFont(StandardFonts.HelveticaBold)

const MARGIN = 72
const WIDTH = 612
const HEIGHT = 792
const LINE_H = 22

function addPage(lines) {
  const page = doc.addPage([WIDTH, HEIGHT])
  let y = HEIGHT - MARGIN

  for (const [text, isBold] of lines) {
    const f = isBold ? bold : font
    page.drawText(text, { x: MARGIN, y, size: 13, font: f, color: rgb(0, 0, 0) })
    y -= LINE_H
  }
  return page
}

// ── Page 1 ──────────────────────────────────────────
addPage([
  ['CONFIDENTIAL MEDICAL REPORT', true],
  ['', false],
  ['Patient: John Smith', false],
  ['DOB: 15/06/2024', false],
  ['Admission Date: 15/06/2024', false],
  ['', false],
  ['Referring Physician: Dr. Alice Brown', false],
  ['', false],
  ['The patient John Smith presented with mild symptoms.', false],
  ['Follow-up scheduled with Alice Brown on 01/12/2025.', false],
  ['', false],
  ['Notes: John Smith reported no prior history.', false],
])

// ── Page 2 ──────────────────────────────────────────
addPage([
  ['LAB RESULTS', true],
  ['', false],
  ['Patient Name: Jane Doe', false],
  ['Test Date: 22/03/2025', false],
  ['', false],
  ['Reviewed by: Alice Brown', false],
  ['', false],
  ['Cholesterol: 180 mg/dL', false],
  ['Glucose: 95 mg/dL', false],
  ['', false],
  ['Comment: Jane Doe values are within normal range.', false],
  ['Sample collected on 22/03/2025 at 09:00 AM.', false],
])

// ── Page 3 ──────────────────────────────────────────
addPage([
  ['DISCHARGE SUMMARY', true],
  ['', false],
  ['Patient: John Smith', false],
  ['Discharge Date: 30/03/2025', false],
  ['', false],
  ['Attending: Dr. Robert Chen', false],
  ['', false],
  ['Summary: John Smith was discharged in stable condition.', false],
  ['Prescriptions issued on 30/03/2025.', false],
  ['', false],
  ['Copy to: Robert Chen, Alice Brown', false],
])

const bytes = await doc.save()
writeFileSync('public/sample-sensitive-document.pdf', bytes)
console.log('✅ Sample PDF generated with:')
console.log('   "John Smith"  → 3 occurrences (pages 1, 1, 3)')
console.log('   "15/06/2024"  → 2 occurrences (page 1)')
console.log('   "Alice Brown" → 2 occurrences (pages 1, 2)')
