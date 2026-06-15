import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from "react-native";
import { Button, Input } from "./ui";
import { useAuth } from "../context/AuthContext";
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
      setError("Add meg az e-mail címed.");
      return;
    }
    if (password.length < 6) {
      setError("A jelszó legalább 6 karakter legyen.");
      return;
    }
    setLoading(true);
    try {
      await linkEmail(name.trim(), email, password);
      onLinked();
    } catch (e: any) {
      setError(humanizeAuthError(e?.message ?? "Ismeretlen hiba"));
    } finally {
      setLoading(false);
    }
  };

  const styles = useStyles();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.kav}
        >
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.title}>Fiók létrehozása</Text>
            <Text style={styles.lead}>
              Add meg az e-mailed és egy jelszót. A jelenlegi listáid és a családod
              megmaradnak – csak mostantól más eszközről is be tudsz lépni.
            </Text>
            <Input placeholder="Neved" value={name} onChangeText={setName} autoCapitalize="words" />
            <Input
              placeholder="E-mail"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <Input
              placeholder="Jelszó (min. 6 karakter)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <View style={styles.row}>
              <Button title="Mégse" variant="secondary" style={{ flex: 1 }} onPress={onClose} />
              <Button title="Mentés" style={{ flex: 1 }} onPress={submit} loading={loading} />
            </View>
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

function useStyles() {
  return useScaledStyleSheet((fs) => ({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.4)",
      justifyContent: "center",
      padding: spacing.xl,
    },
    kav: { width: "100%" },
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
