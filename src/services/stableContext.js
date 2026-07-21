import { supabase } from './supabaseClient.js'

let cachedProfile = null

export async function loadStableContext() {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  const user = userData?.user
  if (!user) {
    cachedProfile = null
    return null
  }

  const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (error) throw error
  cachedProfile = data
  return data
}

export function getStableId() {
  return cachedProfile?.stable_id || null
}

export function getCachedProfile() {
  return cachedProfile
}

export function clearStableContext() {
  cachedProfile = null
}
