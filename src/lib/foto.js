// Reduz a foto da câmera antes de guardar (fotos de celular passam de 4 MB).
export async function comprimirFoto(arquivo, ladoMax = 1280, qualidade = 0.7) {
  const url = URL.createObjectURL(arquivo)
  try {
    const img = await new Promise((ok, erro) => {
      const i = new Image()
      i.onload = () => ok(i)
      i.onerror = () => erro(new Error('Não foi possível abrir a foto.'))
      i.src = url
    })
    const escala = Math.min(1, ladoMax / Math.max(img.width, img.height))
    const c = document.createElement('canvas')
    c.width = Math.round(img.width * escala)
    c.height = Math.round(img.height * escala)
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height)
    return await new Promise((ok) => c.toBlob(ok, 'image/jpeg', qualidade))
  } finally {
    URL.revokeObjectURL(url)
  }
}

export const blobParaDataURL = (blob) =>
  new Promise((ok) => {
    const r = new FileReader()
    r.onload = () => ok(r.result)
    r.readAsDataURL(blob)
  })
