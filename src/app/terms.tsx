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

export default function TermsOfServiceScreen() {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backButton} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color="#EAEDF3" />
        </Pressable>
        <Text style={styles.headerTitle}>Terms of Service</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.effectiveDate}>Effective Date: {EFFECTIVE_DATE}</Text>

        <Paragraph>
          Welcome to Lumis. These Terms of Service ("Terms") govern your use of
          the Lumis mobile application (the "App") operated by Lumis ("we,"
          "our," or "us"). By using the App, you agree to these Terms.
        </Paragraph>

        {/* 1. Nature of Service */}
        <SectionHeading>1. Nature of Service</SectionHeading>

        <Paragraph>
          Lumis is an AI-powered life coaching tool designed to support personal
          growth, self-reflection, and well-being. Please understand the
          following:
        </Paragraph>

        <BulletItem>
          Lumis is <Text style={styles.bold}>not a licensed therapist</Text>,
          counselor, psychologist, or medical professional.
        </BulletItem>
        <BulletItem>
          Lumis does <Text style={styles.bold}>not provide medical advice</Text>,
          diagnosis, or treatment of any kind.
        </BulletItem>
        <BulletItem>
          Lumis is <Text style={styles.bold}>not a substitute</Text> for
          professional mental health treatment. If you are experiencing a mental
          health crisis or need clinical support, please seek help from a
          qualified professional.
        </BulletItem>

        {/* 2. Eligibility */}
        <SectionHeading>2. Eligibility</SectionHeading>

        <Paragraph>
          You must be at least 18 years old to use Lumis. Users aged 13–17 may
          use the App only with verified parental or guardian consent. Lumis is
          not intended for children under 13.
        </Paragraph>

        {/* 3. No Guarantee of Outcomes */}
        <SectionHeading>3. No Guarantee of Outcomes</SectionHeading>

        <Paragraph>
          Lumis is designed to support your personal growth journey, but we make
          no guarantees regarding specific outcomes, results, or improvements. Your
          experience will vary based on your engagement, personal circumstances,
          and many other factors outside our control.
        </Paragraph>

        {/* 4. User Responsibilities */}
        <SectionHeading>4. User Responsibilities</SectionHeading>

        <Paragraph>By using Lumis, you agree to:</Paragraph>

        <BulletItem>
          <Text style={styles.bold}>Not use Lumis for emergency situations.</Text>{" "}
          If you or someone you know is in immediate danger, call your local
          emergency services (911 in the US).
        </BulletItem>
        <BulletItem>
          <Text style={styles.bold}>Contact crisis services when needed.</Text>{" "}
          If you are experiencing suicidal thoughts or a mental health crisis,
          please call or text 988 (Suicide & Crisis Lifeline) or text HOME to
          741741 (Crisis Text Line).
        </BulletItem>
        <BulletItem>
          Provide accurate information and use the App in good faith.
        </BulletItem>
        <BulletItem>
          Not attempt to misuse, reverse engineer, or exploit the service.
        </BulletItem>

        {/* 5. AI Limitations */}
        <SectionHeading>5. AI Limitations</SectionHeading>

        <Paragraph>
          Lumis uses artificial intelligence to generate responses and insights.
          While we strive for helpful and accurate output, please be aware:
        </Paragraph>

        <BulletItem>
          AI-generated responses may not always be accurate, complete, or
          appropriate for your specific situation.
        </BulletItem>
        <BulletItem>
          The AI may occasionally produce responses that are incorrect or
          misleading. Always use your own judgment.
        </BulletItem>
        <BulletItem>
          Lumis should be used as a supportive tool alongside — not as a
          replacement for — your own critical thinking and professional guidance
          when needed.
        </BulletItem>

        {/* 6. Subscriptions & Payments */}
        <SectionHeading>6. Subscriptions & Payments</SectionHeading>

        <Paragraph>
          Lumis may offer premium features through paid subscriptions.
          Subscriptions are managed through the Apple App Store, Google Play
          Store, and RevenueCat.
        </Paragraph>

        <BulletItem>
          Payment is processed by Apple or Google through their respective app
          stores.
        </BulletItem>
        <BulletItem>
          Subscriptions automatically renew unless cancelled at least 24 hours
          before the end of the current billing period.
        </BulletItem>
        <BulletItem>
          You can manage or cancel your subscription through your device's app
          store settings.
        </BulletItem>
        <BulletItem>
          Refunds are subject to Apple's and Google's respective refund policies.
        </BulletItem>

        {/* 7. Intellectual Property */}
        <SectionHeading>7. Intellectual Property</SectionHeading>

        <Paragraph>
          All content, design, code, and intellectual property within the Lumis
          App is owned by Lumis and protected by applicable copyright, trademark,
          and other intellectual property laws. You may not copy, modify,
          distribute, or create derivative works from any part of the App without
          our express written permission.
        </Paragraph>
        <Paragraph>
          Content you create within the App (such as journal entries and goals)
          remains yours. By using the service, you grant us a limited license to
          process this content solely to provide and improve the coaching service.
        </Paragraph>

        {/* 8. Limitation of Liability */}
        <SectionHeading>8. Limitation of Liability</SectionHeading>

        <Paragraph>
          To the maximum extent permitted by applicable law, Lumis and its
          officers, employees, and affiliates shall not be liable for any
          indirect, incidental, special, consequential, or punitive damages
          arising from or related to your use of the App.
        </Paragraph>
        <Paragraph>
          The App is provided "as is" and "as available" without warranties of
          any kind, either express or implied, including but not limited to
          implied warranties of merchantability, fitness for a particular
          purpose, and non-infringement.
        </Paragraph>
        <Paragraph>
          In no event shall our total liability exceed the amount you paid to us
          in the twelve (12) months preceding the event giving rise to the claim.
        </Paragraph>

        {/* 9. Termination */}
        <SectionHeading>9. Termination</SectionHeading>

        <Paragraph>
          We reserve the right to suspend or terminate your account at any time
          if we reasonably believe you have violated these Terms, including but
          not limited to:
        </Paragraph>

        <BulletItem>Misusing the service or acting in bad faith.</BulletItem>
        <BulletItem>
          Attempting to circumvent security measures or exploit the AI system.
        </BulletItem>
        <BulletItem>
          Using the service for unlawful purposes or in ways that harm other
          users.
        </BulletItem>

        <Paragraph>
          You may also delete your account at any time through the Settings
          screen in the App.
        </Paragraph>

        {/* 10. Governing Law */}
        <SectionHeading>10. Governing Law</SectionHeading>

        <Paragraph>
          These Terms shall be governed by and construed in accordance with the
          laws of the State of Delaware, United States, without regard to its
          conflict of law provisions. Any disputes arising from these Terms or
          your use of the App shall be resolved in the courts located in
          Delaware, USA.
        </Paragraph>

        {/* 11. Contact Us */}
        <SectionHeading>11. Contact Us</SectionHeading>

        <Paragraph>
          If you have questions or concerns about these Terms of Service, please
          contact us at:
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
