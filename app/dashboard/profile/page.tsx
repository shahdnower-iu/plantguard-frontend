"use client";
// app/dashboard/profile/page.tsx
import { useState, useEffect } from "react";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Leaf,
  Crown,
  Shield,
  LogOut,
  Camera,
  Lock,
  Eye,
  EyeOff,
  History,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { user as userApi } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import Link from "next/link";

export default function ProfilePage() {
  const { currentUser, setCurrentUser, logout } = useApp();

  // ── Local State ─────────────────────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phoneNumber: "",
    city: "",
    country: "",
  });

  // Password change
  const [showChangePw, setShowChangePw] = useState(false);
  const [pwForm, setPwForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);

  // ── Form Sync ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser) return;
    setForm({
      firstName: currentUser.firstName,
      lastName: currentUser.lastName,
      phoneNumber: currentUser.phoneNumber ?? "",
      city: currentUser.city ?? "",
      country: currentUser.country ?? "",
    });
  }, [currentUser]);

  // ── Save Profile ────────────────────────────────────────────────────────────
  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);
    try {
      const updated = await userApi.updateProfile({
        firstName: form.firstName,
        lastName: form.lastName,
        phoneNumber: form.phoneNumber || undefined,
        city: form.city || undefined,
        country: form.country || undefined,
      });
      setCurrentUser(updated.user);
      setIsEditing(false);
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    if (currentUser) {
      setForm({
        firstName: currentUser.firstName,
        lastName: currentUser.lastName,
        phoneNumber: currentUser.phoneNumber ?? "",
        city: currentUser.city ?? "",
        country: currentUser.country ?? "",
      });
    }
    setIsEditing(false);
    setSaveError(null);
  };

  // ── Avatar ──────────────────────────────────────────────────────────────────
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser) return;

    try {
      const result = await userApi.updateProfileImage(file);
      setCurrentUser({ ...currentUser, profileImageUrl: result.imageUrl });
    } catch (err) {
      console.error(err);
    }
  };

  // ── Password Change ─────────────────────────────────────────────────────────
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);

    if (pwForm.newPassword !== pwForm.confirm) {
      setPwError("Passwords do not match.");
      return;
    }
    if (pwForm.newPassword.length < 8) {
      setPwError("Must be at least 8 characters.");
      return;
    }

    setPwSaving(true);
    try {
      await userApi.changePassword(pwForm.currentPassword, pwForm.newPassword);
      setShowChangePw(false);
      setPwForm({ currentPassword: "", newPassword: "", confirm: "" });
      setPwSuccess(true);
      setTimeout(() => setPwSuccess(false), 3000);
    } catch (err: unknown) {
      setPwError(err instanceof Error ? err.message : "Failed to change password.");
    } finally {
      setPwSaving(false);
    }
  };

  // ── Account Actions ─────────────────────────────────────────────────────────
  const handleLogout = () => logout();

  const handleDeleteAccount = async () => {
    if (!confirm("Delete your account permanently? This cannot be undone.")) return;
    try {
      await userApi.deleteAccount();
      await logout();
    } catch {}
  };

  if (!currentUser) return null;

  const initials = `${currentUser.firstName?.[0] ?? ""}${currentUser.lastName?.[0] ?? ""}`.toUpperCase();
  const isPro = (currentUser as any).subscription === "PRO";

  // Scan quotas from user model
  const diseaseUsed = (currentUser as any).diseaseScansThisWeek ?? 0;
  const spreadUsed = (currentUser as any).spreadScansThisWeek ?? 0;

  const diseaseLimit = isPro ? Infinity : 15;
  const spreadLimit = isPro ? Infinity : 10;

  const diseaseProgress = isPro ? 0 : Math.min(Math.round((diseaseUsed / diseaseLimit) * 100), 100);
  const spreadProgress = isPro ? 0 : Math.min(Math.round((spreadUsed / spreadLimit) * 100), 100);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Profile Hero */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
          {/* Avatar */}
          <div className="relative shrink-0">
            {currentUser.profileImage ? (
              <img
                src={currentUser.profileImage}
                alt="Profile"
                className="h-20 w-20 rounded-2xl object-cover ring-2 ring-border"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary text-2xl font-bold text-primary-foreground">
                {initials}
              </div>
            )}
            <label className="absolute -bottom-1 -right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border-2 border-background bg-primary text-primary-foreground hover:opacity-90">
              <Camera className="h-3.5 w-3.5" />
              <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
            </label>
          </div>

          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-xl font-bold text-foreground">
              {currentUser.firstName} {currentUser.lastName}
            </h1>
            <p className="text-sm text-muted-foreground">{currentUser.email}</p>

            <div className="mt-2 flex flex-wrap justify-center gap-2 sm:justify-start">
              <span
                className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                  isPro
                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Crown className="h-3 w-3" />
                {(currentUser as any).subscription} Plan
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                <Leaf className="h-3 w-3" /> Plant Guardian
              </span>
            </div>
          </div>

          <div className="flex gap-2 shrink-0">
            {isEditing ? (
              <>
                <Button variant="outline" size="sm" onClick={handleCancelEdit}>
                  Cancel
                </Button>
                <Button size="sm" disabled={isSaving} onClick={handleSave}>
                  {isSaving ? "Saving…" : "Save"}
                </Button>
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                Edit Profile
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="mb-5 text-sm font-semibold text-foreground">Personal Information</h2>

        {saveError && (
          <p className="mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{saveError}</p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <InfoField label="First Name" icon={<User className="h-4 w-4 text-muted-foreground" />} display={currentUser.firstName} editing={isEditing}>
            <Input value={form.firstName} onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))} />
          </InfoField>

          <InfoField label="Last Name" icon={<User className="h-4 w-4 text-muted-foreground" />} display={currentUser.lastName} editing={isEditing}>
            <Input value={form.lastName} onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))} />
          </InfoField>

          <InfoField label="Email" icon={<Mail className="h-4 w-4 text-muted-foreground" />} display={currentUser.email} editing={false} />

          <InfoField label="Phone" icon={<Phone className="h-4 w-4 text-muted-foreground" />} display={currentUser.phoneNumber || "—"} editing={isEditing}>
            <Input type="tel" value={form.phoneNumber} onChange={(e) => setForm((p) => ({ ...p, phoneNumber: e.target.value }))} />
          </InfoField>

          <InfoField label="City" icon={<MapPin className="h-4 w-4 text-muted-foreground" />} display={currentUser.city || "—"} editing={isEditing}>
            <Input value={form.city} onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))} />
          </InfoField>

          <InfoField label="Country" icon={<MapPin className="h-4 w-4 text-muted-foreground" />} display={currentUser.country || "—"} editing={isEditing}>
            <Input value={form.country} onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))} />
          </InfoField>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs text-muted-foreground">Member Since</Label>
            <div className="flex items-center gap-2 text-sm text-foreground">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              {new Date((currentUser as any).createdAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })}
            </div>
          </div>
        </div>
      </div>

      {/* Password */}
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Password</h2>
            {pwSuccess && <p className="text-xs text-primary mt-0.5">Password updated successfully ✓</p>}
          </div>
          <Button size="sm" variant="outline" onClick={() => { setShowChangePw((v) => !v); setPwError(null); }}>
            <Lock className="h-3.5 w-3.5" />
            {showChangePw ? "Cancel" : "Change Password"}
          </Button>
        </div>

        {showChangePw && (
          <form onSubmit={handleChangePassword} className="flex flex-col gap-3">
            {pwError && <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">{pwError}</p>}

            <PwField label="Current Password" value={pwForm.currentPassword} show={showCur} onToggle={() => setShowCur((v) => !v)} onChange={(v) => setPwForm((p) => ({ ...p, currentPassword: v }))} />

            <PwField label="New Password" value={pwForm.newPassword} show={showNew} onToggle={() => setShowNew((v) => !v)} onChange={(v) => setPwForm((p) => ({ ...p, newPassword: v }))} />

            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Confirm New Password</Label>
              <Input
                type="password"
                value={pwForm.confirm}
                onChange={(e) => setPwForm((p) => ({ ...p, confirm: e.target.value }))}
                placeholder="Re-enter new password"
                required
              />
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <Button type="button" variant="outline" size="sm" onClick={() => { setShowChangePw(false); setPwError(null); }}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={pwSaving}>
                {pwSaving ? "Saving…" : "Update Password"}
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* Scan Usage */}
      <div className="rounded-2xl border border-border bg-card p-6 space-y-6">
        <h2 className="text-sm font-semibold text-foreground">Usage This Week</h2>

        {/* Disease Scans */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-sm font-medium">Disease Detection</p>
            <p className="text-sm text-muted-foreground">
              {isPro ? "Unlimited" : `${diseaseUsed} / ${diseaseLimit}`}
            </p>
          </div>
          {!isPro && <Progress value={diseaseProgress} className="h-1.5" />}
          <Link href="/dashboard/scanHistory">
            <Button variant="outline" size="sm" className="mt-3 gap-2 w-full sm:w-auto">
              <History className="h-4 w-4" />
              View Disease Scan History
            </Button>
          </Link>
        </div>

        {/* Spread Analysis */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-sm font-medium">Spread Analysis</p>
            <p className="text-sm text-muted-foreground">
              {isPro ? "Unlimited" : `${spreadUsed} / ${spreadLimit}`}
            </p>
          </div>
          {!isPro && <Progress value={spreadProgress} className="h-1.5" />}
          <Link href="/dashboard/spreadHistory">
            <Button variant="outline" size="sm" className="mt-3 gap-2 w-full sm:w-auto">
              <History className="h-4 w-4" />
              View Spread Analysis History
            </Button>
          </Link>
        </div>

        {isPro && (currentUser as any).subscriptionEndDate && (
          <p className="text-xs text-muted-foreground pt-2 border-t">
            Pro subscription active until{" "}
            <span className="font-medium">
              {new Date((currentUser as any).subscriptionEndDate).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </p>
        )}

        {!isPro && (
          <Button asChild variant="outline" className="gap-2">
            <a href="/dashboard/upgrade">
              <Crown className="h-4 w-4 text-amber-500" /> Upgrade to Pro
            </a>
          </Button>
        )}
      </div>

      {/* Danger Zone */}
      <div className="rounded-2xl border border-destructive/20 bg-card p-6">
        <h2 className="mb-1 text-sm font-semibold text-foreground">Account Actions</h2>
        <p className="mb-4 text-xs text-muted-foreground">Manage your session and account data.</p>

        <div className="flex flex-wrap gap-3">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={handleLogout}>
            <LogOut className="h-3.5 w-3.5" /> Log Out
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/5"
            onClick={handleDeleteAccount}
          >
            <Shield className="h-3.5 w-3.5" /> Delete Account
          </Button>
        </div>
      </div>
    </div>
  );
}

// Reusable Components
function InfoField({
  label,
  icon,
  display,
  editing,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  display: string;
  editing: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {editing && children ? (
        children
      ) : (
        <div className="flex items-center gap-2 text-sm text-foreground min-h-[2.25rem]">
          {icon}
          <span>{display}</span>
        </div>
      )}
    </div>
  );
}

function PwField({
  label,
  value,
  show,
  onToggle,
  onChange,
}: {
  label: string;
  value: string;
  show: boolean;
  onToggle: () => void;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label className="text-xs">{label}</Label>
      <div className="relative">
        <Input
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="pr-9"
          required
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}