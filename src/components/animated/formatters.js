export const Formatter = {
  number: (value) => Intl.NumberFormat('en-US').format(+value.toFixed(0)),
  currency: (value) => Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(+value.toFixed(0)),
}
