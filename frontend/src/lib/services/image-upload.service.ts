import { supabase } from '$lib/supabase/client';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_CONFIG = {
  bucketName: 'user-images',
  maxSizeMB: 10,
}

export interface UploadResult {
  path: string;
  url: string;
}

export class ImageUploadService {
  /**
   * Upload an image to Supabase Storage
   */
  static async uploadUserImage(
    file: File,
    userId: string,
    type: 'profile' | 'cover',
    options?: { bucketName?: string }
  ): Promise<UploadResult> {
    // Validate file is an image
    if (!file.type.startsWith('image/')) {
      throw new Error('File must be an image');
    }

    // Max file size check (10MB)
    const maxSize = STORAGE_CONFIG.maxSizeMB * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error(`Image must be less than ${STORAGE_CONFIG.maxSizeMB}MB`);
    }

    // Generate a unique file name
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}-${type}-${uuidv4()}.${fileExt}`;
    
    // CHANGED: Use 'public' folder to match RLS policy
    const filePath = `public/${fileName}`;

    const bucketName = options?.bucketName || STORAGE_CONFIG.bucketName;

    try {
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Storage error:', error);
        throw new Error(`Upload failed: ${error.message}`);
      }

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(data.path);

      return {
        path: data.path,
        url: urlData.publicUrl
      };
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }
  }

  /**
   * Delete an image from Supabase Storage
   */
  static async deleteUserImage(path: string, options?: { bucketName?: string }): Promise<void> {
    const bucketName = options?.bucketName || STORAGE_CONFIG.bucketName;

    const { error } = await supabase.storage
      .from(bucketName)
      .remove([path]);

    if (error) {
      console.error('Error deleting image:', error);
      throw new Error(`Delete failed: ${error.message}`);
    }
  }
}