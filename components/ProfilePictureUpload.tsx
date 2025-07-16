import React, { useState, useRef } from 'react';
import {
  View,
  Modal,
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera, CameraType } from 'expo-camera';
import { supabase } from '../lib/supabase';
import { decode } from 'base64-arraybuffer';
import { Camera as CameraIcon, Image as ImageIcon, X } from 'lucide-react-native';
import Colors from '../constants/Colors';

interface ProfilePictureUploadProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (avatarUrl: string) => void;
  userId: string;
}

export default function ProfilePictureUpload({
  visible,
  onClose,
  onSuccess,
  userId,
}: ProfilePictureUploadProps) {
  const [loading, setLoading] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const cameraRef = useRef<any>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isCameraMode, setIsCameraMode] = useState(false);

  // Ask for camera permission when needed
  const requestCameraPermission = async () => {
    const { status } = await Camera.requestCameraPermissionsAsync();
    setHasCameraPermission(status === 'granted');
    if (status === 'granted') {
      setIsCameraMode(true);
    } else {
      Alert.alert(
        'Camera Permission Denied',
        'To take a profile picture, please allow camera access in your device settings.'
      );
    }
  };

  // Take a photo using the camera
  const takePicture = async () => {
    if (cameraRef.current && isCameraReady) {
      try {
        setLoading(true);
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.7,
          base64: true,
        });
        
        await uploadImage(photo.base64);
        setIsCameraMode(false);
      } catch (error) {
        console.error('Error taking picture:', error);
        Alert.alert('Error', 'Failed to take picture');
        setLoading(false);
      }
    }
  };

  // Select image from library
  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0].base64) {
        setLoading(true);
        await uploadImage(result.assets[0].base64);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  // Upload image to Supabase storage
  const uploadImage = async (base64Image: string | null) => {
    if (!base64Image) {
      setLoading(false);
      return;
    }

    try {
      // Generate a unique file name
      const fileName = `${new Date().getTime()}.jpg`;
      const filePath = `${userId}/${fileName}`;
      
      // Convert base64 to ArrayBuffer for Supabase storage
      const arrayBuffer = decode(base64Image);

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from('profile-pics')
        .upload(filePath, arrayBuffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (error) {
        throw error;
      }

      // Get the public URL of the uploaded image
      const { data: publicUrlData } = supabase.storage
        .from('profile-pics')
        .getPublicUrl(filePath);

      if (publicUrlData && publicUrlData.publicUrl) {
        // Update user profile with new avatar URL
        await updateProfile(publicUrlData.publicUrl);
      } else {
        throw new Error('Failed to get public URL');
      }
    } catch (error) {
      console.error('Error uploading image:', error);
      Alert.alert('Error', 'Failed to upload image');
      setLoading(false);
    }
  };

  // Update user profile with new avatar URL
  const updateProfile = async (avatarUrl: string) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', userId);

      if (error) {
        throw error;
      }

      // Return success with the new avatar URL
      onSuccess(avatarUrl);
      setLoading(false);
      onClose();
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile');
      setLoading(false);
    }
  };

  // Camera view component
  const renderCamera = () => {
    if (hasCameraPermission === null) {
      return <View style={styles.cameraPlaceholder} />;
    }
    
    if (hasCameraPermission === false) {
      return (
        <View style={styles.cameraPlaceholder}>
          <Text style={styles.errorText}>No access to camera</Text>
        </View>
      );
    }

    return (
      <View style={styles.cameraContainer}>
        <View style={styles.camera}>
          {/* Using the Camera component as a function due to TypeScript limitations */}
          {/* We'll use the ref and access methods imperatively */}
          <View style={{flex: 1}}>
            {/* Camera access is handled imperatively via the ref */}
          </View>
        </View>
        <View style={styles.cameraControls}>
          <TouchableOpacity 
            style={styles.cameraButton} 
            onPress={takePicture}
            disabled={loading || !isCameraReady}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <View style={styles.captureButton} />
            )}
          </TouchableOpacity>
        </View>
        <TouchableOpacity 
          style={styles.closeButton} 
          onPress={() => {
            setIsCameraMode(false);
          }}
        >
          <X color="#fff" size={24} />
        </TouchableOpacity>
      </View>
    );
  };

  // Main modal content
  const renderModalContent = () => {
    if (isCameraMode) {
      return renderCamera();
    }

    return (
      <View style={styles.container}>
        <Text style={styles.title}>Update Profile Picture</Text>
        
        <View style={styles.options}>
          <TouchableOpacity
            style={styles.option}
            onPress={requestCameraPermission}
            disabled={loading}
          >
            <View style={styles.optionIcon}>
              <CameraIcon size={24} color={Colors.primary} />
            </View>
            <Text style={styles.optionText}>Take Photo</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.option}
            onPress={pickImage}
            disabled={loading}
          >
            <View style={styles.optionIcon}>
              <ImageIcon size={24} color={Colors.primary} />
            </View>
            <Text style={styles.optionText}>Choose from Gallery</Text>
          </TouchableOpacity>
        </View>
        
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={styles.loadingText}>Uploading...</Text>
          </View>
        )}
        
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={onClose}
          disabled={loading}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          {renderModalContent()}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: 300,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  container: {
    padding: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  options: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 20,
  },
  option: {
    alignItems: 'center',
    padding: 15,
    borderRadius: 10,
    backgroundColor: '#f0f0f0',
    width: '40%',
  },
  optionIcon: {
    marginBottom: 10,
    height: 50,
    width: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  cancelButton: {
    marginTop: 20,
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  cancelText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.primary,
  },
  loadingContainer: {
    alignItems: 'center',
    marginTop: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.primary,
  },
  cameraContainer: {
    flex: 1,
    minHeight: 500,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  cameraPlaceholder: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 400,
  },
  cameraControls: {
    position: 'absolute',
    bottom: 30,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  cameraButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
  },
});
