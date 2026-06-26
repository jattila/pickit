import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
} from "react-native";
import { Button, Input, PasswordInput } from "./ui";
import { KeyboardAwareModalScroll } from "./KeyboardAwareScrollView";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../context/LocaleContext";
import { humanizeAuthError } from "../lib/authErrors";
import { colors, spacing, radius } from "../theme";
import { useScaledStyleSheet } from "../theme/useScaledStyleSheet";

interface Props {
  visible: boolean;
  onClose: () => void;
  onLinked: () => void;
}

/** Anonim (vendég) fiók összekapcsolása e-maillel és jelszóval. */
export function LinkAccountModal({ visible, onClose, onLinked }: Props) {
  const { displayName, linkEmail } = useAuth();
  const { t } = useTranslation();
  const [name, setName] = useState(displayName);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (visible) {
      setName(displayName);
      setEmail("");
      setPassword("");
      setError(null);
    }
  }, [visible, displayName]);

  const submit = async () => {
    setError(null);
    if (!email.trim()) {
      setError(t("auth.enterEmail"));
      return;
    }
    if (password.length < 6) {
      setError(t("auth.weakPassword"));
      return;
    }
    setLoading(true);
    try {
      await linkEmail(name.trim(), email, password);
      onLinked();
    } catch (e: any) {
      setError(humanizeAuthError(e?.message ?? "", t));
    } finally {
      setLoading(false);
    }
  };

  const styles = useStyles();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <KeyboardAwareModalScroll contentContainerStyle={styles.modalScroll}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.title}>{t("linkAccount.title")}</Text>
            <Text style={styles.lead}>{t("linkAccount.lead")}</Text>
            <Input
              placeholder={t("linkAccount.namePlaceholder")}
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
            <Input
              placeholder={t("login.emailPlaceholder")}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <PasswordInput
              placeholder={t("linkAccount.passwordPlaceholder")}
              value={password}
              onChangeText={setPassword}
              showPasswordLabel={t("common.showPassword")}
              hidePasswordLabel={t("common.hidePassword")}
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <View style={styles.row}>
              <Button title={t("common.cancel")} variant="secondary" style={{ flex: 1 }} onPress={onClose} />
              <Button title={t("common.save")} style={{ flex: 1 }} onPress={submit} loading={loading} />
            </View>
          </Pressable>
        </KeyboardAwareModalScroll>
      </View>
    </Modal>
  );
}

function useStyles() {
  return useScaledStyleSheet((fs) => ({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.4)",
      padding: spacing.xl,
    },
    modalScroll: {
      paddingHorizontal: 0,
    },
    sheet: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: spacing.lg,
      gap: spacing.md,
    },
    title: { fontSize: fs(20), fontWeight: "800", color: colors.text },
    lead: { fontSize: fs(14), color: colors.textMuted, lineHeight: fs(20) },
    error: { color: colors.danger, fontSize: fs(14) },
    row: { flexDirection: "row", gap: spacing.md, marginTop: spacing.xs },
  }));
}
