import { supabase } from './supabaseClient.js'
import { getStableId } from './stableContext.js'

// The horse-photos bucket is private (stable-scoped RLS), so a plain public
// URL won't work — a signed URL is required. Ten years is effectively
// "permanent" for this app's purposes; re-uploading a photo replaces the
// object in place (same fixed filename) rather than accumulating old files.
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 365 * 10

export async function uploadHorsePhoto(horseId, file) {
  const stableId = getStableId()
  const extension = (file.name.split('.').pop() || 'jpg').toLowerCase()
  const path = `${stableId}/${horseId}/photo.${extension}`

  const { error: uploadError } = await supabase.storage
    .from('horse-photos')
    .upload(path, file, { upsert: true, contentType: file.type })
  if (uploadError) throw uploadError

  const { data, error: signError } = await supabase.storage
    .from('horse-photos')
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS)
  if (signError) throw signError

  return data.signedUrl
}

export async function deleteHorsePhoto(horseId) {
  const stableId = getStableId()
  const { data: files, error: listError } = await supabase.storage
    .from('horse-photos')
    .list(`${stableId}/${horseId}`)
  if (listError) throw listError
  if (!files?.length) return
  const { error: removeError } = await supabase.storage
    .from('horse-photos')
    .remove(files.map((file) => `${stableId}/${horseId}/${file.name}`))
  if (removeError) throw removeError
}
