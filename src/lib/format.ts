const formatter = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 })

export function naira(amount: number) {
  return formatter.format(amount)
}
