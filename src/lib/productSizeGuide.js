const MENS_SHOE_TABLE = {
  label: "Men's",
  columns: ['UK size', 'US', 'EU', 'Foot length (cm)', 'Foot length (in)'],
  rows: [
    ['3', '4', '37', '22.9 cm', '9'],
    ['3.5', '4.5', '37-38', '23.3 cm', '9 1/4'],
    ['4', '5', '38', '23.8 cm', '9 3/8'],
    ['4.5', '5.5', '38-39', '24.1 cm', '9 1/2'],
    ['5', '6', '39', '24.8 cm', '9 3/4'],
    ['5.5', '6.5', '39-40', '25.1 cm', '9 7/8'],
    ['6', '7', '40', '25.4 cm', '10'],
    ['6.5', '7.5', '41', '25.8 cm', '10 1/8'],
    ['7', '8', '41-42', '26 cm', '10 1/4'],
    ['7.5', '8.5', '42', '26.7 cm', '10 1/2'],
    ['8', '9', '43', '27.3 cm', '10 3/4'],
    ['8.5', '9.5', '43-44', '27.7 cm', '10 7/8'],
    ['9', '10', '44', '27.9 cm', '11'],
    ['9.5', '10.5', '44-45', '28.6 cm', '11 1/4'],
    ['10', '11', '45', '29.2 cm', '11 1/2'],
    ['10.5', '11.5', '45-46', '29.5 cm', '11 5/8'],
    ['11', '12', '46', '29.8 cm', '11 3/4'],
    ['12', '13', '48', '30.5 cm', '12'],
    ['13', '14', '49', '31.1 cm', '12 1/4'],
    ['14', '15', '50', '31.7 cm', '12 1/2'],
  ],
  options: [
    'UK 3',
    'UK 3.5',
    'UK 4',
    'UK 4.5',
    'UK 5',
    'UK 5.5',
    'UK 6',
    'UK 6.5',
    'UK 7',
    'UK 7.5',
    'UK 8',
    'UK 8.5',
    'UK 9',
    'UK 9.5',
    'UK 10',
    'UK 10.5',
    'UK 11',
    'UK 12',
    'UK 13',
    'UK 14',
  ],
}

const WOMENS_SHOE_TABLE = {
  label: "Women's",
  columns: ['UK size', 'US', 'EUR', 'Foot length (cm)', 'Foot length (in)'],
  rows: [
    ['2', '4', '34-35', '21.0 cm', '8 1/4'],
    ['2.5', '4.5', '35', '21.4 cm', '8 3/8'],
    ['3', '5', '35-36', '21.9 cm', '8 5/8'],
    ['3.5', '5.5', '36', '22.3 cm', '8 3/4'],
    ['4', '6', '36-37', '22.8 cm', '9'],
    ['4.5', '6.5', '37', '23.2 cm', '9 1/8'],
    ['5', '7', '37-38', '23.6 cm', '9 1/4'],
    ['5.5', '7.5', '38', '24.0 cm', '9 1/2'],
    ['6', '8', '38-39', '24.5 cm', '9 5/8'],
    ['6.5', '8.5', '39', '24.9 cm', '9 3/4'],
    ['7', '9', '39-40', '25.3 cm', '10'],
    ['7.5', '9.5', '40', '25.8 cm', '10 1/8'],
    ['8', '10', '40-41', '26.2 cm', '10 1/4'],
  ],
  options: [
    'UK 2',
    'UK 2.5',
    'UK 3',
    'UK 3.5',
    'UK 4',
    'UK 4.5',
    'UK 5',
    'UK 5.5',
    'UK 6',
    'UK 6.5',
    'UK 7',
    'UK 7.5',
    'UK 8',
  ],
}

/** Prefix stored in cart for shoe rows so men's UK7 and women's UK 7 stay distinct. */
export function shoeCartSizeLabel(variant, ukOption) {
  if (!ukOption) return ''
  const who = variant === 'womens' ? "Women's" : "Men's"
  return `${who} ${ukOption}`
}

/** @param {'mens' | 'womens'} variant */
export function getShoeVariantTable(guide, variant) {
  if (!guide?.isShoe) return null
  return variant === 'womens' ? guide.womens : guide.mens
}

/** Shoe charts with foot length show cm and in in data; UI picks one column at a time. */
export function sizeGuideHasFootLengthUnitToggle(displayGuide) {
  const cols = displayGuide?.columns
  if (!Array.isArray(cols) || cols.length < 2) return false
  const n = cols.length
  return /\(\s*cm\s*\)/i.test(cols[n - 2] ?? '') && /\(\s*in\s*\)/i.test(cols[n - 1] ?? '')
}

/** Apparel-style tables: measurements in cm only (no paired inch column in data). */
function apparelGuideHasCmMeasurements(displayGuide) {
  if (!displayGuide?.columns) return false
  if (sizeGuideHasFootLengthUnitToggle(displayGuide)) return false
  return displayGuide.columns.some((c) => /\(cm\)/i.test(c))
}

/** Show cm | in control for shoes (foot length) or apparel (converted from cm). */
export function sizeGuideHasMeasurementUnitToggle(displayGuide) {
  return sizeGuideHasFootLengthUnitToggle(displayGuide) || apparelGuideHasCmMeasurements(displayGuide)
}

function cmCellToInches(cell) {
  const s = String(cell).trim()
  const range = s.match(/^([\d.]+)\s*-\s*([\d.]+)\s*cm\s*$/i)
  if (range) {
    const a = (parseFloat(range[1]) / 2.54).toFixed(1)
    const b = (parseFloat(range[2]) / 2.54).toFixed(1)
    return `${a}–${b} in`
  }
  const single = s.match(/^([\d.]+)\s*cm\s*$/i)
  if (single) {
    return `${(parseFloat(single[1]) / 2.54).toFixed(1)} in`
  }
  return cell
}

function apparelTableInInches(displayGuide) {
  const cmColIdx = displayGuide.columns
    .map((c, i) => (/\(cm\)/i.test(c) ? i : -1))
    .filter((i) => i >= 0)
  const columns = displayGuide.columns.map((col) => col.replace(/\(cm\)/i, '(in)'))
  const rows = displayGuide.rows.map((row) =>
    row.map((cell, idx) => (cmColIdx.includes(idx) ? cmCellToInches(cell) : cell)),
  )
  return { ...displayGuide, columns, rows }
}

/**
 * @param {typeof MENS_SHOE_TABLE | typeof WOMENS_SHOE_TABLE | object} displayGuide
 * @param {'cm' | 'in'} unit
 */
export function measurementTableForUnit(displayGuide, unit) {
  if (!displayGuide?.columns || !displayGuide?.rows) return displayGuide

  if (sizeGuideHasFootLengthUnitToggle(displayGuide)) {
    const cols = displayGuide.columns
    const n = cols.length
    if (unit === 'cm') {
      return {
        ...displayGuide,
        columns: cols.slice(0, n - 1),
        rows: displayGuide.rows.map((r) => r.slice(0, n - 1)),
      }
    }
    return {
      ...displayGuide,
      columns: [...cols.slice(0, n - 2), cols[n - 1]],
      rows: displayGuide.rows.map((r) => [...r.slice(0, n - 2), r[n - 1]]),
    }
  }

  if (apparelGuideHasCmMeasurements(displayGuide)) {
    if (unit === 'cm') return displayGuide
    return apparelTableInInches(displayGuide)
  }

  return displayGuide
}

/** Size tables and option labels for apparel-style products (aligned with product detail). */
export function getSizeGuide(product) {
  const text = `${product?.name || ''} ${product?.category?.name || ''} ${product?.category?.slug || ''}`.toLowerCase()

  if (
    /shoe|sneaker|trainer|footwear|sandal|loafer|heel|mule|clog|\bboots?\b|bootie|booties|high-top|low-top|canvas sneaker/.test(
      text,
    )
  ) {
    const defaultVariant = /wom(e|a)ns?|ladies|lady|\bgirls?\b|pumps?|ballet|stiletto|peep-toe|peep toe/.test(text)
      ? 'womens'
      : 'mens'

    return {
      isShoe: true,
      title: '',
      description: '',
      defaultVariant,
      mens: MENS_SHOE_TABLE,
      womens: WOMENS_SHOE_TABLE,
    }
  }

  if (!/shirt|jacket|hoodie|dress|pant|trouser|sweater|tee|fashion|onesie|sock/.test(text)) return null

  const isBottom = /pant|trouser|short|legging/.test(text)
  const isDress = /dress/.test(text)

  if (isBottom) {
    return {
      isApparel: true,
      title: 'Size and Fit',
      description: 'Choose your usual size. If you are between sizes, we suggest sizing up for comfort.',
      columns: ['Size', 'Waist (cm)', 'Hip (cm)', 'Inseam (cm)'],
      rows: [
        ['XS', '60-67 cm', '84-91 cm', '72 cm'],
        ['S', '68-75 cm', '92-99 cm', '74 cm'],
        ['M', '76-83 cm', '100-107 cm', '76 cm'],
        ['L', '84-91 cm', '108-115 cm', '78 cm'],
        ['XL', '92-100 cm', '116-124 cm', '79 cm'],
        ['XXL', '101-110 cm', '125-134 cm', '80 cm'],
      ],
      options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    }
  }

  if (isDress) {
    return {
      isApparel: true,
      title: 'Size and Fit',
      description: 'Regular fit. For a looser silhouette, choose one size up.',
      columns: ['Size', 'Bust (cm)', 'Waist (cm)', 'Length (cm)'],
      rows: [
        ['XS', '76-83 cm', '58-64 cm', '92 cm'],
        ['S', '84-91 cm', '65-71 cm', '95 cm'],
        ['M', '92-99 cm', '72-79 cm', '98 cm'],
        ['L', '100-107 cm', '80-87 cm', '101 cm'],
        ['XL', '108-116 cm', '88-96 cm', '103 cm'],
        ['XXL', '117-126 cm', '97-106 cm', '105 cm'],
      ],
      options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    }
  }

  return {
    isApparel: true,
    title: 'Size and Fit',
    description: 'Standard fit. Check measurements below to pick your best size.',
    columns: ['Size', 'Chest (cm)', 'Shoulder (cm)', 'Length (cm)'],
    rows: [
      ['XS', '80-87 cm', '40 cm', '64 cm'],
      ['S', '88-95 cm', '42 cm', '67 cm'],
      ['M', '96-103 cm', '45 cm', '70 cm'],
      ['L', '104-111 cm', '48 cm', '73 cm'],
      ['XL', '112-120 cm', '51 cm', '76 cm'],
      ['XXL', '121-130 cm', '54 cm', '79 cm'],
    ],
    options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  }
}
