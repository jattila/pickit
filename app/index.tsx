import React from "react";
import { Redirect } from "expo-router";
import { useAuth } from "../src/context/AuthContext";

export default function Index() {
  const { user, profile } = useAuth();

  if (!user) {
    return <Redirect href="/login" />;
  }
  if (profile && !profile.householdId) {
    return <Redirect href="/setup" />;
  }
  return <Redirect href="/(tabs)" />;
}
