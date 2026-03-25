// Validadores de CPF e CNPJ (algoritmo oficial)

export function isValidCpf(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, '')
  if (cleaned.length !== 11) return false
  if (/^(\d)\1{10}$/.test(cleaned)) return false

  let sum = 0
  for (let i = 0; i < 9; i++) sum += parseInt(cleaned[i]) * (10 - i)
  let remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(cleaned[9])) return false

  sum = 0
  for (let i = 0; i < 10; i++) sum += parseInt(cleaned[i]) * (11 - i)
  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  return remainder === parseInt(cleaned[10])
}

export function isValidCnpj(cnpj: string): boolean {
  const cleaned = cnpj.replace(/\D/g, '')
  if (cleaned.length !== 14) return false
  if (/^(\d)\1{13}$/.test(cleaned)) return false

  const calcDigit = (base: string, weights: number[]) => {
    const sum = base.split('').reduce((acc, d, i) => acc + parseInt(d) * weights[i], 0)
    const remainder = sum % 11
    return remainder < 2 ? 0 : 11 - remainder
  }

  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

  const d1 = calcDigit(cleaned.slice(0, 12), weights1)
  const d2 = calcDigit(cleaned.slice(0, 13), weights2)

  return d1 === parseInt(cleaned[12]) && d2 === parseInt(cleaned[13])
}

export function isValidPlaca(placa: string): boolean {
  // Formato Mercosul: ABC1D23 ou antigo: ABC-1234
  const mercosul = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/
  const antigo = /^[A-Z]{3}[0-9]{4}$/
  const cleaned = placa.replace(/[-\s]/g, '').toUpperCase()
  return mercosul.test(cleaned) || antigo.test(cleaned)
}

export function isValidPhone(phone: string): boolean {
  // E.164: +55 seguido de 10-11 dígitos
  return /^\+55[1-9][0-9]{9,10}$/.test(phone)
}
