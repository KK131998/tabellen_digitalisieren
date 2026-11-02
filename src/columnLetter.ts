export function columnLetter(index: number) {
  let number = index + 1
  let letters = ''
  while (number > 0) {
    const remainder = (number - 1) % 26
    letters = String.fromCharCode(65 + remainder) + letters
    number = Math.floor((number - 1) / 26)
  }
  return letters
}
