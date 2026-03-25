import { isValidCpf, isValidCnpj, isValidPlaca, isValidPhone } from '../cpf-cnpj'

describe('isValidCpf', () => {
  it('valida CPF correto', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true)
    expect(isValidCpf('52998224725')).toBe(true)
  })
  it('rejeita CPF inválido', () => {
    expect(isValidCpf('111.111.111-11')).toBe(false)
    expect(isValidCpf('000.000.000-00')).toBe(false)
    expect(isValidCpf('123.456.789-00')).toBe(false)
  })
})

describe('isValidCnpj', () => {
  it('valida CNPJ correto', () => {
    expect(isValidCnpj('11.222.333/0001-81')).toBe(true)
    expect(isValidCnpj('11222333000181')).toBe(true)
  })
  it('rejeita CNPJ inválido', () => {
    expect(isValidCnpj('11.111.111/1111-11')).toBe(false)
    expect(isValidCnpj('00000000000000')).toBe(false)
  })
})

describe('isValidPlaca', () => {
  it('valida placa antiga', () => {
    expect(isValidPlaca('ABC1234')).toBe(true)
    expect(isValidPlaca('ABC-1234')).toBe(true)
  })
  it('valida placa Mercosul', () => {
    expect(isValidPlaca('ABC1D23')).toBe(true)
  })
  it('rejeita placa inválida', () => {
    expect(isValidPlaca('AB1234')).toBe(false)
    expect(isValidPlaca('ABCD123')).toBe(false)
    expect(isValidPlaca('')).toBe(false)
  })
})

describe('isValidPhone', () => {
  it('valida telefone E.164 brasileiro', () => {
    expect(isValidPhone('+5511999999999')).toBe(true)
    expect(isValidPhone('+5521987654321')).toBe(true)
  })
  it('rejeita formato inválido', () => {
    expect(isValidPhone('11999999999')).toBe(false)
    expect(isValidPhone('+55119999')).toBe(false)
  })
})
