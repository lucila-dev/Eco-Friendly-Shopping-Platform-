/** Size tables and option labels for apparel-style products (aligned with product detail). */
export function getSizeGuide(product) {
  const text = `${product?.name || ''} ${product?.category?.name || ''}`.toLowerCase()
  if (!/shirt|jacket|hoodie|dress|pant|trouser|sweater|tee|fashion|onesie|sock/.test(text)) return null

  const isBottom = /pant|trouser|short|legging/.test(text)
  const isDress = /dress/.test(text)

  if (isBottom) {
    return {
      title: 'Size and Fit',
      description: 'Choose your usual size. If you are between sizes, we suggest sizing up for comfort.',
      columns: ['Size', 'Waist (cm)', 'Hip (cm)', 'Inseam (cm)'],
      rows: [
        ['XS', '60-67', '84-91', '72'],
        ['S', '68-75', '92-99', '74'],
        ['M', '76-83', '100-107', '76'],
        ['L', '84-91', '108-115', '78'],
        ['XL', '92-100', '116-124', '79'],
        ['XXL', '101-110', '125-134', '80'],
      ],
      options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    }
  }

  if (isDress) {
    return {
      title: 'Size and Fit',
      description: 'Regular fit. For a looser silhouette, choose one size up.',
      columns: ['Size', 'Bust (cm)', 'Waist (cm)', 'Length (cm)'],
      rows: [
        ['XS', '76-83', '58-64', '92'],
        ['S', '84-91', '65-71', '95'],
        ['M', '92-99', '72-79', '98'],
        ['L', '100-107', '80-87', '101'],
        ['XL', '108-116', '88-96', '103'],
        ['XXL', '117-126', '97-106', '105'],
      ],
      options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    }
  }

  return {
    title: 'Size and Fit',
    description: 'Standard fit. Check measurements below to pick your best size.',
    columns: ['Size', 'Chest (cm)', 'Shoulder (cm)', 'Length (cm)'],
    rows: [
      ['XS', '80-87', '40', '64'],
      ['S', '88-95', '42', '67'],
      ['M', '96-103', '45', '70'],
      ['L', '104-111', '48', '73'],
      ['XL', '112-120', '51', '76'],
      ['XXL', '121-130', '54', '79'],
    ],
    options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  }
}
