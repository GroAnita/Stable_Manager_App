import { supabase } from './supabaseClient.js'

export async function signUp({ email, password, fullName }) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  })
  if (error) throw error
  return data
}

export async function signIn({ email, password }) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}

export function onAuthStateChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session))
  return data.subscription
}

export async function getMyProfile() {
  const { data: userData } = await supabase.auth.getUser()
  const user = userData?.user
  if (!user) return null
  const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (error) throw error
  return data
}

export async function createStable({ name, address, city, postalCode, phone, email }) {
  const { data, error } = await supabase.rpc('create_stable', {
    p_name: name,
    p_address: address || null,
    p_city: city || null,
    p_postal_code: postalCode || null,
    p_phone: phone || null,
    p_email: email || null,
  })
  if (error) throw error
  return data
}
