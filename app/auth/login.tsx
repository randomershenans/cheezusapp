import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, Animated, Image } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { X, Mail, Lock } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';
import GoogleSignInButton from '@/components/GoogleSignInButton';

export default function LoginScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      await signIn(email, password);
      router.replace('/(tabs)/profile');
    } catch (error) {
      setError('Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.closeButtonContainer}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => router.replace('/')}
              activeOpacity={0.7}
            >
              <X size={24} color={Colors.text} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.heroSection}>
            <View style={styles.logoContainer}>
              <Image 
                source={require('@/assets/images/logo.png')} 
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>
              Continue your delicious cheese journey
            </Text>
          </View>
          
          <View style={styles.formContainer}>
            
            {error ? <Text style={styles.errorText}>{error}</Text> : null}
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputContainer}>
                <Mail size={20} color={Colors.subtleText} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="your@email.com"
                  placeholderTextColor={Colors.subtleText}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (error) setError('');
                  }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputContainer}>
                <Lock size={20} color={Colors.subtleText} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your password"
                  placeholderTextColor={Colors.subtleText}
                  value={password}
                  onChangeText={(text) => {
                    setPassword(text);
                    if (error) setError('');
                  }}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </View>
            
            <TouchableOpacity style={styles.forgotPasswordContainer}>
              <Text style={styles.forgotPasswordText}>Forgot password?</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.loginButton, isLoading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <Text style={styles.loginButtonText}>
                {isLoading ? 'Logging in...' : 'Log In'}
              </Text>
            </TouchableOpacity>

            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.divider} />
            </View>
            
            <GoogleSignInButton />
            
            <View style={styles.bottomActions}>
              <TouchableOpacity 
                style={styles.signupButton}
                onPress={() => router.replace('/auth/signup')}
                activeOpacity={0.8}
              >
                <Text style={styles.signupButtonText}>Create Account</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={styles.laterButton}
                onPress={() => router.replace('/')}
                activeOpacity={0.7}
              >
                <Text style={styles.laterButtonText}>Maybe Later</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: Layout.spacing.xl,
  },
  closeButtonContainer: {
    padding: Layout.spacing.m,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroSection: {
    paddingHorizontal: Layout.spacing.xl,
    paddingVertical: Layout.spacing.xxl,
    alignItems: 'center',
  },
  logoContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Layout.spacing.l,
  },
  logo: {
    width: 100,
    height: 100,
  },
  formContainer: {
    flex: 1,
    padding: Layout.spacing.l,
    marginTop: Layout.spacing.xl,
  },
  title: {
    fontSize: Typography.sizes['2xl'],
    fontFamily: Typography.fonts.heading,
    color: Colors.text,
    marginBottom: Layout.spacing.m,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    textAlign: 'center',
    marginBottom: Layout.spacing.l,
    lineHeight: Typography.sizes.base * Typography.lineHeights.normal,
  },
  errorText: {
    color: Colors.error,
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodyMedium,
    textAlign: 'center',
    marginBottom: Layout.spacing.m,
  },
  formGroup: {
    marginBottom: Layout.spacing.l,
  },
  label: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.text,
    marginBottom: Layout.spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Layout.borderRadius.medium,
    backgroundColor: Colors.backgroundSecondary,
    paddingHorizontal: Layout.spacing.m,
  },
  inputContainerFocused: {
    borderColor: '#FCD95B',
    backgroundColor: '#FFFEF7',
  },
  inputIcon: {
    marginRight: Layout.spacing.s,
  },
  input: {
    flex: 1,
    paddingVertical: Layout.spacing.m,
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.text,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: Layout.spacing.l,
  },
  forgotPasswordText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodyMedium,
    color: '#FCD95B',
  },
  loginButton: {
    backgroundColor: '#FCD95B',
    paddingVertical: Layout.spacing.m + 2,
    borderRadius: Layout.borderRadius.large,
    marginBottom: Layout.spacing.m,
    ...Layout.shadow.medium,
  },
  loginButtonDisabled: {
    backgroundColor: Colors.subtleText,
    opacity: 0.7,
  },
  loginButtonText: {
    color: Colors.text,
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodySemiBold,
    textAlign: 'center',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Layout.spacing.m,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    marginHorizontal: Layout.spacing.m,
    color: Colors.subtleText,
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
  },
  bottomActions: {
    marginTop: Layout.spacing.l,
  },
  signupButton: {
    backgroundColor: Colors.backgroundSecondary,
    paddingVertical: Layout.spacing.m + 2,
    borderRadius: Layout.borderRadius.large,
    marginBottom: Layout.spacing.m,
    borderWidth: 2,
    borderColor: '#FCD95B',
  },
  signupButtonText: {
    color: '#FCD95B',
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodySemiBold,
    textAlign: 'center',
  },
  laterButton: {
    paddingVertical: Layout.spacing.s,
  },
  laterButtonText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.subtleText,
    textAlign: 'center',
  }
});