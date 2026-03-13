import { View, Text, ScrollView, Pressable, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

const EFFECTIVE_DATE = "March 1, 2026";

function SectionHeading({ children }: { children: string }) {
  return <Text style={styles.sectionHeading}>{children}</Text>;
}

function Paragraph({ children }: { children: React.ReactNode }) {
  return <Text style={styles.paragraph}>{children}</Text>;
}

function BulletItem({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.bulletRow}>
      <Text style={styles.bullet}>•</Text>
      <Text style={styles.bulletText}>{children}</Text>
    </View>
  );
}

export default function PrivacyPolicyScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color="#EAEDF3" />
        </Pressable>
        <Text style={styles.headerTitle}>Privacy Policy</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.effectiveDate}>Effective Date: {EFFECTIVE_DATE}</Text>

        <Paragraph>
          Lumis ("we," "our," or "us") operates the Lumis mobile application (the
          "App"). This Privacy Policy explains how we collect, use, store, and
          protect your information when you use our AI life coaching service.
        </Paragraph>

        <Paragraph>
          By using Lumis, you agree to the collection and use of information in
          accordance with this policy.
        </Paragraph>

        {/* 1. Information We Collect */}
        <SectionHeading>1. Information We Collect</SectionHeading>

        <Paragraph>We collect the following types of information:</Paragraph>

        <BulletItem>
          <Text style={styles.bold}>Account Information</Text> — your email
          address, display name, and authentication credentials when you create
          an account.
        </BulletItem>
        <BulletItem>
          <Text style={styles.bold}>Conversations</Text> — text messages you
          exchange with your AI coach during chat sessions.
        </BulletItem>
        <BulletItem>
          <Text style={styles.bold}>Voice Sessions</Text> — audio data from
          voice coaching sessions, processed in real time.
        </BulletItem>
        <BulletItem>
          <Text style={styles.bold}>Mood Entries</Text> — mood check-ins,
          emotional reflections, and related context you provide.
        </BulletItem>
        <BulletItem>
          <Text style={styles.bold}>Goals & Habits</Text> — personal goals,
          habit tracking data, and progress information.
        </BulletItem>
        <BulletItem>
          <Text style={styles.bold}>Usage Data</Text> — session frequency, feature
          usage patterns, and app interaction data used to improve the service.
        </BulletItem>

        {/* 2. How We Use Your Data */}
        <SectionHeading>2. How We Use Your Data</SectionHeading>

        <Paragraph>Your information is used to:</Paragraph>

        <BulletItem>
          Personalize your AI coaching experience and provide relevant,
          context-aware guidance.
        </BulletItem>
        <BulletItem>
          Generate insights, patterns, and progress reports based on your
          interactions and tracked data.
        </BulletItem>
        <BulletItem>
          Improve and develop the Lumis service, including training and
          refining our coaching models.
        </BulletItem>
        <BulletItem>
          Send you relevant notifications such as check-in reminders, habit
          nudges, and milestone celebrations.
        </BulletItem>

        {/* 3. AI Processing */}
        <SectionHeading>3. AI Processing</SectionHeading>

        <Paragraph>
          Lumis uses artificial intelligence to provide coaching. Your
          conversations and related data are processed by AI models provided by
          third-party services including OpenRouter and Google to generate
          responses and insights.
        </Paragraph>
        <Paragraph>
          This means your conversation data may be sent to third-party AI
          providers for processing. These providers are bound by their own
          privacy policies and data processing agreements. We select providers
          that offer appropriate data protection measures.
        </Paragraph>

        {/* 4. Data Storage & Security */}
        <SectionHeading>4. Data Storage & Security</SectionHeading>

        <Paragraph>
          Your data is stored on Supabase, a secure cloud infrastructure
          platform. We implement the following security measures:
        </Paragraph>

        <BulletItem>
          <Text style={styles.bold}>Encryption at rest</Text> — all stored data
          is encrypted.
        </BulletItem>
        <BulletItem>
          <Text style={styles.bold}>Row Level Security (RLS)</Text> — database
          policies ensure you can only access your own data.
        </BulletItem>
        <BulletItem>
          <Text style={styles.bold}>Encrypted connections</Text> — all data
          transmitted between the App and our servers uses TLS encryption.
        </BulletItem>

        <Paragraph>
          While we take reasonable measures to protect your data, no method of
          electronic storage or transmission is 100% secure.
        </Paragraph>

        {/* 5. Data Sharing */}
        <SectionHeading>5. Data Sharing</SectionHeading>

        <Paragraph>
          <Text style={styles.bold}>We do not sell your personal data.</Text>
        </Paragraph>
        <Paragraph>
          We may share data with the following categories of third parties, solely
          to operate and improve the service:
        </Paragraph>

        <BulletItem>
          <Text style={styles.bold}>AI Providers</Text> — conversation data is
          processed by third-party AI services (via OpenRouter and Google) to
          generate coaching responses.
        </BulletItem>
        <BulletItem>
          <Text style={styles.bold}>Payment Processing</Text> — subscription and
          payment data is handled by RevenueCat, Apple, and Google. We do not
          store your payment card details.
        </BulletItem>

        {/* 6. Data Retention */}
        <SectionHeading>6. Data Retention</SectionHeading>

        <Paragraph>
          We retain your data for as long as your account is active. If you
          delete your account, we will delete your personal data from our
          systems. Some data may be retained in backups for a limited period
          before being permanently removed.
        </Paragraph>

        {/* 7. Your Rights */}
        <SectionHeading>7. Your Rights</SectionHeading>

        <Paragraph>You have the right to:</Paragraph>

        <BulletItem>
          <Text style={styles.bold}>Export your data</Text> — download a copy of
          all your data at any time from the Settings screen in the App.
        </BulletItem>
        <BulletItem>
          <Text style={styles.bold}>Delete your data</Text> — permanently delete
          all your data and account from the Settings screen. This action is
          irreversible.
        </BulletItem>
        <BulletItem>
          <Text style={styles.bold}>Access your data</Text> — view and review
          the information we hold about you within the App.
        </BulletItem>

        {/* 8. Children's Privacy */}
        <SectionHeading>8. Children's Privacy</SectionHeading>

        <Paragraph>
          Lumis is not intended for use by anyone under the age of 13. We do not
          knowingly collect personal information from children under 13. If we
          become aware that we have collected data from a child under 13, we will
          take steps to delete that information promptly.
        </Paragraph>

        {/* 9. Changes to This Policy */}
        <SectionHeading>9. Changes to This Policy</SectionHeading>

        <Paragraph>
          We may update this Privacy Policy from time to time. When we make
          changes, we will notify you through the App and update the effective
          date at the top of this policy. Your continued use of Lumis after
          changes are posted constitutes your acceptance of the updated policy.
        </Paragraph>

        {/* 10. Contact Us */}
        <SectionHeading>10. Contact Us</SectionHeading>

        <Paragraph>
          If you have any questions or concerns about this Privacy Policy or your
          data, please contact us at:
        </Paragraph>

        <Text style={styles.contactEmail}>support@lumis.app</Text>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0C1120",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#242A4240",
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#1A1F35",
  },
  headerTitle: {
    fontSize: 18,
    lineHeight: 25,
    fontFamily: "Inter-SemiBold",
    color: "#EAEDF3",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 48,
  },
  effectiveDate: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "Inter-Medium",
    color: "#8B92A8",
    marginBottom: 24,
  },
  sectionHeading: {
    fontSize: 18,
    lineHeight: 25,
    fontFamily: "Inter-SemiBold",
    color: "#EAEDF3",
    marginTop: 32,
    marginBottom: 12,
  },
  paragraph: {
    fontSize: 15,
    lineHeight: 24,
    fontFamily: "Inter",
    color: "#8B92A8",
    marginBottom: 12,
  },
  bold: {
    fontFamily: "Inter-SemiBold",
    color: "#EAEDF3",
  },
  bulletRow: {
    flexDirection: "row",
    paddingLeft: 4,
    marginBottom: 8,
  },
  bullet: {
    fontSize: 15,
    lineHeight: 24,
    color: "#7C3AED",
    marginRight: 10,
    fontFamily: "Inter",
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 24,
    fontFamily: "Inter",
    color: "#8B92A8",
  },
  contactEmail: {
    fontSize: 15,
    lineHeight: 24,
    fontFamily: "Inter-SemiBold",
    color: "#7C3AED",
    marginTop: 4,
  },
  bottomSpacer: {
    height: 40,
  },
});
