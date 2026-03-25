export interface WatermarkMeta {
  placa: string
  arrivedAt: string
  lat: number
  lng: number
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { URL.revokeObjectURL(url); resolve(img) }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Falha ao carregar imagem')) }
    img.src = url
  })
}

function canvasToFile(canvas: HTMLCanvasElement, name: string, type: string): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error('Falha ao converter canvas'))
        resolve(new File([blob], name, { type }))
      },
      type === 'image/png' ? 'image/png' : 'image/jpeg',
      0.92,
    )
  })
}

/**
 * Aplica marca d'água em uma imagem com placa e data/hora.
 * Retorna o arquivo original se não for imagem.
 */
export async function applyWatermark(file: File, meta: WatermarkMeta): Promise<File> {
  if (!file.type.startsWith('image/')) return file

  const img = await loadImage(file)
  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height

  const ctx = canvas.getContext('2d')!
  ctx.drawImage(img, 0, 0)

  const line1 = `FreteCheck · ${meta.placa} · ${new Date(meta.arrivedAt).toLocaleString('pt-BR')}`
  const line2 = `GPS: ${meta.lat.toFixed(6)}, ${meta.lng.toFixed(6)}`
  const fontSize = Math.max(Math.round(img.width * 0.025), 16)
  const lineHeight = Math.round(fontSize * 1.3)

  ctx.font = `bold ${fontSize}px sans-serif`
  ctx.lineWidth = Math.max(fontSize * 0.15, 2)
  ctx.lineJoin = 'round'

  const padding = Math.round(img.width * 0.02)
  const x = padding
  const y2 = img.height - padding
  const y1 = y2 - lineHeight

  // Sombra para legibilidade em qualquer fundo
  ctx.strokeStyle = 'rgba(0,0,0,0.75)'
  ctx.strokeText(line1, x, y1)
  ctx.strokeText(line2, x, y2)
  ctx.fillStyle = 'rgba(255,255,255,0.90)'
  ctx.fillText(line1, x, y1)
  ctx.fillText(line2, x, y2)

  return canvasToFile(canvas, file.name, file.type)
}
