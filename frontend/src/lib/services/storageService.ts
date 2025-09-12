import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function uploadFile(file: File, userId: string) {
  const filePath = `chat/${userId}/${Date.now()}-${file.name}`;

  const { data, error } = await supabase.storage
    .from("Storage") // 👈 your bucket name
    .upload(filePath, file);

  if (error) throw error;

  // Get public URL (or use signed URLs for private mode)
  const { data: publicData } = supabase.storage
    .from("Storage")
    .getPublicUrl(filePath);

  return {
    url: publicData.publicUrl,
    filePath,
    size: file.size,
    type: file.type,
    name: file.name
  };
}
