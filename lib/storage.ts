import * as ImagePicker from 'expo-image-picker';
import { Platform } from 'react-native';
import { supabase } from './supabase';
import { decode } from 'base64-arraybuffer';
import { randomUUID } from 'expo-crypto';

// Storage bucket name for cheese photos
export const CHEESE_PHOTOS_BUCKET = 'cheese-photos';

// Use the existing bucket that was created by admin
export const ensureStorageBucket = async () => {
  try {
    // We assume the bucket already exists since it was created by admin
    // We'll just return true without checking or creating
    return true;
  } catch (error) {
    console.error('Unexpected error during bucket setup:', error);
    return false;
  }
};

// Upload an image to storage bucket
export const uploadImageToStorage = async (base64Image: string, fileExt = 'jpg'): Promise<string | null> => {
  try {
    // Get current authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User must be authenticated to upload images');
    }
    
    // Ensure fileExt is clean and doesn't contain the data URI parts
    let cleanFileExt = fileExt;
    if (cleanFileExt.includes(':') || cleanFileExt.includes('/') || cleanFileExt.includes(';')) {
      // Extract just the file extension from something like "image/jpeg" or "data:image/jpeg;base64"
      cleanFileExt = cleanFileExt.split('/').pop()?.split(';')[0] || 'jpg';
    }
    
    // Create a unique filename with user ID to help with RLS policies
    const fileName = `${user.id}/${randomUUID()}.${cleanFileExt}`;
    const contentType = `image/${cleanFileExt}`;
    
    // More flexible processing of base64 data
    let base64FileData;
    if (base64Image.includes('base64,')) {
      // Format: data:image/jpeg;base64,/9j/4AAQSkZJRg...
      base64FileData = base64Image.split('base64,')[1];
    } else if (base64Image.startsWith('/9j/') || base64Image.startsWith('iVBOR') || base64Image.startsWith('PHN2')) {
      // Already just the base64 data
      base64FileData = base64Image;
    } else {
      console.error('Unrecognized image format:', base64Image.substring(0, 50) + '...');
      throw new Error('Invalid image format');
    }
    
    if (!base64FileData || base64FileData.trim() === '') {
      throw new Error('Invalid image data');
    }
    
    // Use existing bucket (already created by admin)
    const { error } = await supabase.storage
      .from(CHEESE_PHOTOS_BUCKET)
      .upload(fileName, decode(base64FileData), {
        contentType,
        upsert: true
      });
      
    if (error) {
      console.error('Error uploading image:', error);
      return null;
    }
    
    // Get the public URL for the uploaded image
    const { data } = supabase.storage
      .from(CHEESE_PHOTOS_BUCKET)
      .getPublicUrl(fileName);
      
    if (!data?.publicUrl) {
      console.error('Failed to get public URL for uploaded image');
      return null;
    }
    
    // Log the URL for debugging
    console.log('Image uploaded successfully, URL:', data.publicUrl);
    return data.publicUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    return null;
  }
};

// Take a photo using the camera
export const takeCameraPhoto = async (): Promise<string | null> => {
  // Request camera permissions
  const { status } = await ImagePicker.requestCameraPermissionsAsync();
  
  if (status !== 'granted') {
    console.error('Camera permission denied');
    return null;
  }
  
  // Launch camera
  const result = await ImagePicker.launchCameraAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
    base64: true,
  });
  
  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }
  
  // Upload the image
  const asset = result.assets[0];
  if (!asset.base64) {
    console.error('No base64 data in camera result');
    return null;
  }
  
  // Always use standard image format for camera photos
  // Using jpeg consistently for camera photos
  const imageType = 'jpeg';
  const formattedBase64 = `data:image/${imageType};base64,${asset.base64}`;
  
  console.log('Camera photo using format:', imageType);
  return uploadImageToStorage(formattedBase64, imageType);
};

// Pick an image from the gallery
export const pickImageFromGallery = async (): Promise<string | null> => {
  // Request media library permissions
  const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  
  if (status !== 'granted') {
    console.error('Media library permission denied');
    return null;
  }
  
  // Launch image picker
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.8,
    base64: true,
  });
  
  if (result.canceled || !result.assets || result.assets.length === 0) {
    return null;
  }
  
  // Upload the image
  const asset = result.assets[0];
  if (!asset.base64) {
    console.error('No base64 data in gallery result');
    return null;
  }
  
  // Extract file extension but ensure it's a valid image type
  let imageType = asset.uri.split('.').pop()?.toLowerCase() || '';
  
  // Normalize to standard image extensions
  if (!['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(imageType)) {
    // Default to jpeg if we get an unrecognized extension
    imageType = 'jpeg';
  }
  
  console.log('Gallery image using format:', imageType);
  const formattedBase64 = `data:image/${imageType};base64,${asset.base64}`;
  
  return uploadImageToStorage(formattedBase64, imageType);
};

// Process image with AI (placeholder for now)
export const analyzeImageWithAI = async (): Promise<string | null> => {
  // For now, this is just a placeholder that will pick an image and pretend to analyze it
  const imageUrl = await pickImageFromGallery();
  
  if (!imageUrl) {
    return null;
  }
  
  // In a real implementation, you would send the image to an AI service
  // and then process the results before returning
  
  return imageUrl;
};
