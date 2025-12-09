import React, { useState } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, Image, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { X, User, Mail, Lock } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import Colors from '@/constants/Colors';
import Layout from '@/constants/Layout';
import Typography from '@/constants/Typography';
import GoogleSignInButton from '@/components/GoogleSignInButton';

export default function SignupScreen() {
  const router = useRouter();
  const { signUp } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleSignup = async () => {
    if (!name || !email || !password) {
      setError('Please fill in all fields');
      return;
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    
    setIsLoading(true);
    setError('');
    
    try {
      await signUp(email, password, name);
      setShowConfirmation(true);
      // Also try Alert for native
      if (Platform.OS !== 'web') {
        Alert.alert(
          'Check Your Email',
          'We\'ve sent a confirmation link to your email. Please check your inbox (and spam folder) to verify your account before signing in.',
          [{ text: 'OK', onPress: () => router.replace('/auth/login') }]
        );
      }
    } catch (error) {
      setError('Error creating account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <X size={24} color={Colors.text} />
        </TouchableOpacity>
      </View>
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroSection}>
            <View style={styles.logoContainer}>
              <Image 
                source={require('@/assets/images/logo.png')} 
                style={styles.logo}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.welcomeTitle}>Join Cheezus</Text>
            <Text style={styles.welcomeSubtitle}>
              Create an account to save recipes, learn about cheese, and join our community.
            </Text>
          </View>
          
          <View style={styles.formContainer}>
            {showConfirmation ? (
              <View style={styles.confirmationContainer}>
                <Text style={styles.confirmationTitle}>📧 Check Your Email!</Text>
                <Text style={styles.confirmationText}>
                  We've sent a confirmation link to {email}. Please check your inbox (and spam folder) to verify your account.
                </Text>
                <TouchableOpacity
                  style={styles.confirmationButton}
                  onPress={() => router.replace('/auth/login')}
                >
                  <Text style={styles.confirmationButtonText}>Go to Login</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <GoogleSignInButton />

            <View style={styles.dividerContainer}>
              <View style={styles.divider} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.divider} />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Full Name</Text>
              <View style={styles.inputContainer}>
                <User size={20} color={Colors.subtleText} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your full name"
                  placeholderTextColor={Colors.subtleText}
                  value={name}
                  onChangeText={(text) => {
                    setName(text);
                    if (error) setError('');
                  }}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>
            </View>
            
            <View style={styles.formGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputContainer}>
                <Mail size={20} color={Colors.subtleText} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
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
                  placeholder="Create a password (min 6 characters)"
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
            
            <TouchableOpacity 
              style={[styles.signupButton, isLoading && styles.signupButtonDisabled]}
              onPress={handleSignup}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              <Text style={styles.signupButtonText}>
                {isLoading ? 'Creating Account...' : 'Join the Community'}
              </Text>
            </TouchableOpacity>
            
            <View style={styles.loginContainer}>
              <Text style={styles.loginText}>Already have an account?</Text>
              <TouchableOpacity 
                onPress={() => router.replace('/auth/login')}
                activeOpacity={0.7}
              >
                <Text style={styles.loginLink}>Log In</Text>
              </TouchableOpacity>
            </View>
              </>
            )}
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
    paddingTop: Platform.OS === 'web' ? Layout.spacing.m : 0,
  },
  scrollContent: {
    flexGrow: 1,
  },
  header: {
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
    paddingTop: Layout.spacing.xl,
    paddingBottom: Layout.spacing.l,
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
  welcomeTitle: {
    fontSize: Typography.sizes['4xl'],
    fontFamily: Typography.fonts.heading,
    color: Colors.text,
    marginBottom: Layout.spacing.m,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    textAlign: 'center',
    lineHeight: Typography.sizes.base * Typography.lineHeights.normal,
  },
  formContainer: {
    padding: Layout.spacing.xl,
    backgroundColor: '#F9F9F9',
    borderTopLeftRadius: Layout.borderRadius.large,
    borderTopRightRadius: Layout.borderRadius.large,
    flex: 1,
  },
  errorText: {
    color: Colors.error,
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodyMedium,
    textAlign: 'center',
    marginBottom: Layout.spacing.m,
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
  formGroup: {
    marginBottom: Layout.spacing.l,
  },
  label: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodyMedium,
    color: Colors.text,
    marginBottom: Layout.spacing.xs,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    backgroundColor: Colors.background,
    borderRadius: Layout.borderRadius.medium,
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
    ...Platform.select({
      web: {
        outline: 'none',
      },
    }),
  },
  signupButton: {
    backgroundColor: '#FCD95B',
    borderRadius: Layout.borderRadius.large,
    paddingVertical: Layout.spacing.m + 2,
    marginTop: Layout.spacing.xl,
    marginBottom: Layout.spacing.m,
    ...Layout.shadow.medium,
    ...Platform.select({
      web: {
        cursor: 'pointer',
      },
    }),
  },
  signupButtonDisabled: {
    backgroundColor: Colors.subtleText,
    opacity: 0.7,
  },
  signupButtonText: {
    color: Colors.text,
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodySemiBold,
    textAlign: 'center',
  },
  loginContainer: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    justifyContent: 'center',
    marginTop: Layout.spacing.m,
  },
  loginText: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    textAlign: 'center',
  },
  loginLink: {
    fontSize: Typography.sizes.sm,
    fontFamily: Typography.fonts.bodySemiBold,
    color: '#FCD95B',
    marginLeft: Platform.OS === 'web' ? 5 : 0,
    marginTop: Platform.OS === 'web' ? 0 : Layout.spacing.s,
    textAlign: 'center',
    ...Platform.select({
      web: { cursor: 'pointer' },
    }),
  },
  confirmationContainer: {
    alignItems: 'center',
    paddingVertical: Layout.spacing.xl,
  },
  confirmationTitle: {
    fontSize: Typography.sizes['2xl'],
    fontFamily: Typography.fonts.heading,
    color: Colors.text,
    marginBottom: Layout.spacing.m,
    textAlign: 'center',
  },
  confirmationText: {
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.body,
    color: Colors.subtleText,
    textAlign: 'center',
    lineHeight: Typography.sizes.base * Typography.lineHeights.normal,
    marginBottom: Layout.spacing.xl,
    paddingHorizontal: Layout.spacing.m,
  },
  confirmationButton: {
    backgroundColor: '#FCD95B',
    paddingVertical: Layout.spacing.m,
    paddingHorizontal: Layout.spacing.xxl,
    borderRadius: Layout.borderRadius.large,
  },
  confirmationButtonText: {
    color: Colors.text,
    fontSize: Typography.sizes.base,
    fontFamily: Typography.fonts.bodySemiBold,
    textAlign: 'center',
  },
});