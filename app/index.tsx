import React from "react";
import { Redirect } from "expo-router";
import { useAuth } from "../src/context/AuthContext";
import { isMemberSuspended } from "../src/lib/household";

export default function Index() {
  const { user, profile, household } = useAuth();

  if (!user) {
    return <Redirect href="/login" />;
  }
  if (profile && !profile.householdId) {
    return <Redirect href="/setup" />;
  }
  if (profile?.householdId && isMemberSuspended(household, user.uid)) {
    return <Redirect href="/suspended" />;
  }
  return <Redirect href="/(tabs)" />;
}
