import React, { useState, useEffect } from 'react';
import { TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Bookmark } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';

type BookmarkButtonProps = {
  itemType: 'article' | 'recipe' | 'pairing';
  itemId: string;
  size?: number;
  color?: string;
  style?: any;
};

export default function BookmarkButton({ 
  itemType, 
  itemId, 
  size = 24, 
  color = Colors.text,
  style 
}: BookmarkButtonProps) {
  const { user } = useAuth();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      checkBookmarkStatus();
    }
  }, [user, itemId]);

  const checkBookmarkStatus = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('saved_items')
        .select('id')
        .eq('user_id', user.id)
        .eq('item_type', itemType)
        .eq('item_id', itemId)
        .maybeSingle();

      if (!error) {
        setIsBookmarked(!!data);
      }
    } catch (error) {
      console.error('Error checking bookmark:', error);
    }
  };

  const toggleBookmark = async () => {
    if (!user || loading) return;

    setLoading(true);
    try {
      if (isBookmarked) {
        // Remove bookmark
        const { error } = await supabase
          .from('saved_items')
          .delete()
          .eq('user_id', user.id)
          .eq('item_type', itemType)
          .eq('item_id', itemId);

        if (!error) {
          setIsBookmarked(false);
        }
      } else {
        // Add bookmark
        const { error } = await supabase
          .from('saved_items')
          .insert({
            user_id: user.id,
            item_type: itemType,
            item_id: itemId,
          });

        if (!error) {
          setIsBookmarked(true);
        }
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={toggleBookmark}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator size="small" color={color} />
      ) : (
        <Bookmark
          size={size}
          color={isBookmarked ? Colors.primary : color}
          fill={isBookmarked ? Colors.primary : 'none'}
        />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    ...Layout.shadow.small,
  },
});
