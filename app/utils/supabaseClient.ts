"use server"
import {createClient} from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_SUPABASE_ANON_KEY
console.log(6,"supabaseUrl - ",supabaseUrl)
const supabase = createClient(supabaseUrl,supabaseAnonKey)

export default supabase