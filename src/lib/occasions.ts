// Occasions a wishlist can be for. The emoji-free labels keep the editorial look.
export const OCCASIONS = [
  { id: 'birthday', label: 'Birthday', blurb: 'Another trip around the sun', word: 'love' },
  { id: 'wedding', label: 'Wedding', blurb: 'Help them build a home', word: 'cherish' },
  { id: 'baby', label: 'Baby shower', blurb: 'For the newest little one', word: 'treasure' },
  { id: 'graduation', label: 'Graduation', blurb: 'The next chapter starts here', word: 'need' },
  { id: 'housewarming', label: 'Housewarming', blurb: 'Fill the new place with joy', word: 'enjoy' },
  { id: 'anniversary', label: 'Anniversary', blurb: 'Years well spent', word: 'adore' },
  { id: 'other', label: 'Something else', blurb: 'Any reason to celebrate', word: 'love' },
] as const

export type OccasionId = (typeof OCCASIONS)[number]['id']

export const OCCASION_IDS = OCCASIONS.map((o) => o.id) as [OccasionId, ...OccasionId[]]

export function occasion(id: string) {
  return OCCASIONS.find((o) => o.id === id) ?? OCCASIONS[OCCASIONS.length - 1]
}
