import type { HighlightBox } from '../types'

const MIN_HIGHLIGHT_WIDTH = 8
const HORIZONTAL_PADDING = 2
const VERTICAL_PADDING = 2

export function sliceTextBox(
  bbox: HighlightBox,
  sourceText: string,
  matchIndex: number,
  matchText: string,
): HighlightBox {
  const sourceLength = Math.max(sourceText.length, 1)
  const startRatio = Math.max(matchIndex, 0) / sourceLength
  const widthRatio = Math.max(matchText.length, 1) / sourceLength
  const x = bbox.x + bbox.width * startRatio
  const width = Math.max(bbox.width * widthRatio, MIN_HIGHLIGHT_WIDTH)

  return {
    x: Math.max(x - HORIZONTAL_PADDING, 0),
    y: Math.max(bbox.y - VERTICAL_PADDING, 0),
    width: width + HORIZONTAL_PADDING * 2,
    height: bbox.height + VERTICAL_PADDING * 2,
  }
}

export function mergeBoxes(boxes: HighlightBox[]): HighlightBox | null {
  if (boxes.length === 0) {
    return null
  }

  const left = Math.min(...boxes.map((box) => box.x))
  const top = Math.min(...boxes.map((box) => box.y))
  const right = Math.max(...boxes.map((box) => box.x + box.width))
  const bottom = Math.max(...boxes.map((box) => box.y + box.height))

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  }
}

