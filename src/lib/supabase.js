import { createClient } from '@supabase/supabase-js'

// src/lib/supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://bzriqjatqnydrgnrwngb.supabase.co"
const supabaseAnonKey = "sb_publishable_93qzdvN8hldL_myVn7OGGQ_9bkAXzH_"

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    console.error(error)
    return null
  }

  return data
}

export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    console.error(error)
    return null
  }

  return data
}

export async function logout() {
  await supabase.auth.signOut()
}


