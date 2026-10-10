import { router } from 'expo-router';
import { ArrowLeft, FileText, Lock } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useStatusBarStyle } from '@/hooks/use-status-bar-style';
import { colors } from '@/theme/colors';

/**
 * Terms of Service and Privacy Policy, reachable signed in or out.
 * Draft wording for the PocketPlan project; review before a public release.
 */
export default function LegalScreen() {
  useStatusBarStyle('dark');

  return (
    <SafeAreaView className="flex-1 bg-background" edges={['top', 'bottom']}>
      <View className="flex-row items-center gap-3 px-5 pb-3 pt-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={12}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          className="h-11 w-11 items-center justify-center rounded-full bg-card">
          <ArrowLeft size={22} color={colors.primary} />
        </Pressable>
        <Text className="text-xl font-bold text-ink">Terms & Privacy</Text>
      </View>

      <ScrollView contentContainerClassName="px-5 pb-10" showsVerticalScrollIndicator={false}>
        <Text className="mb-4 text-sm text-muted">Last updated October 2026</Text>

        <Section icon={<FileText size={20} color={colors.accent} />} title="Terms of Service">
          <Item>PocketPlan is a personal budgeting tool for planning your allowance and tracking spending. It is not a bank, wallet or payment service, and it never moves real money.</Item>
          <Item>Budgets, daily limits and insights are calculated from the information you enter. They are guidance, not financial advice.</Item>
          <Item>Keep your password private. You are responsible for activity on your account.</Item>
          <Item>Accounts used to abuse the service may be deactivated by an administrator.</Item>
        </Section>

        <Section icon={<Lock size={20} color={colors.accent} />} title="Privacy Policy">
          <Item>We store your name, email address and the budgets, income, expenses and savings goals you record.</Item>
          <Item>Your data is used only to run PocketPlan for you. It is never sold or shared with advertisers.</Item>
          <Item>Administrators can see basic account details (name, email, sign-up date, status) but not your financial records.</Item>
          <Item>Your sign-in token is stored in your phone&apos;s secure storage and is removed when you sign out.</Item>
          <Item>You can request deletion of your account and its data at any time.</Item>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ icon, title, children }: { icon: ReactNode; title: string; children: ReactNode }) {
  return (
    <View className="mb-4 rounded-3xl border border-border bg-card p-5">
      <View className="mb-3 flex-row items-center gap-2.5">
        <View className="h-9 w-9 items-center justify-center rounded-xl bg-accent-light">{icon}</View>
        <Text className="text-lg font-bold text-ink">{title}</Text>
      </View>
      {children}
    </View>
  );
}

function Item({ children }: { children: ReactNode }) {
  return (
    <View className="mb-2.5 flex-row gap-2.5">
      <View className="mt-[7px] h-1.5 w-1.5 rounded-full bg-accent" />
      <Text className="flex-1 text-[15px] leading-[22px] text-ink">{children}</Text>
    </View>
  );
}
