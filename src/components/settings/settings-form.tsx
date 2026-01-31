"use client";

import { useState, useEffect } from "react";
import { useProfile } from "@/hooks/use-profile";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TIMEZONES } from "@/lib/constants";
import { Check, AlertCircle, ChevronDown, ChevronUp, LogOut, Link, Key, RefreshCw } from "lucide-react";
import { useSync } from "@/hooks/use-sync";

const GOOGLE_SCOPES = [
  {
    scope: "classroom.courses.readonly",
    label: "Google Classroom Courses",
    description: "View your Google Classroom courses",
  },
  {
    scope: "classroom.coursework.me.readonly",
    label: "Google Classroom Assignments",
    description: "View your assignments and coursework",
  },
  {
    scope: "gmail.readonly",
    label: "Gmail (Read Only)",
    description: "Read emails to parse Canvas notifications",
  },
];

export function SettingsForm() {
  const { profile, isLoading, updateProfile, isUpdating } = useProfile();
  const { user, signOut } = useAuth();
  const { sync, isSyncing } = useSync();
  const [displayName, setDisplayName] = useState("");
  const [timezone, setTimezone] = useState("America/Los_Angeles");
  const [canvasToken, setCanvasToken] = useState("");
  const [canvasBaseUrl, setCanvasBaseUrl] = useState("");
  const [canvasCalendarUrl, setCanvasCalendarUrl] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
  const [showScopes, setShowScopes] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [canvasMethod, setCanvasMethod] = useState<"calendar" | "api">("calendar");
  const [syncMessage, setSyncMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showAddApiToken, setShowAddApiToken] = useState(false);

  // Update form values when profile loads
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setTimezone(profile.timezone || "America/Los_Angeles");
      setCanvasBaseUrl(profile.canvas_base_url || "");
      setCanvasCalendarUrl(profile.canvas_calendar_url || "");
      // Set the method based on what's configured
      if (profile.canvas_token) {
        setCanvasMethod("api");
      } else if (profile.canvas_calendar_url) {
        setCanvasMethod("calendar");
      }
    }
  }, [profile]);

  const handleSaveProfile = async () => {
    try {
      await updateProfile({
        display_name: displayName,
        timezone,
      });
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch {
      setSaveStatus("error");
    }
  };

  const handleSaveCanvasApi = async () => {
    try {
      await updateProfile({
        canvas_token: canvasToken || undefined,
        canvas_base_url: canvasBaseUrl || undefined,
      });
      setCanvasToken("");
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch {
      setSaveStatus("error");
    }
  };

  const handleSaveCanvasCalendar = async () => {
    try {
      await updateProfile({
        canvas_calendar_url: canvasCalendarUrl || undefined,
      });
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch {
      setSaveStatus("error");
    }
  };

  const handleDisconnectCanvas = async () => {
    try {
      await updateProfile({
        canvas_token: null,
        canvas_base_url: null,
        canvas_calendar_url: null,
      });
      setCanvasToken("");
      setCanvasBaseUrl("");
      setCanvasCalendarUrl("");
      setSaveStatus("success");
      setTimeout(() => setSaveStatus("idle"), 3000);
    } catch {
      setSaveStatus("error");
    }
  };

  const handleDisconnectGoogle = async () => {
    setIsDisconnecting(true);
    try {
      await signOut();
    } catch (error) {
      console.error("Error disconnecting:", error);
      setIsDisconnecting(false);
    }
  };

  const handleSyncCanvas = async () => {
    setSyncMessage(null);
    const results = await sync("canvas");
    const result = results.canvas;

    if (result?.success) {
      setSyncMessage({
        type: "success",
        text: `Synced ${result.itemsSynced || 0} items from Canvas!`,
      });
    } else {
      setSyncMessage({
        type: "error",
        text: result?.error || "Failed to sync Canvas data",
      });
    }

    // Clear message after 5 seconds
    setTimeout(() => setSyncMessage(null), 5000);
  };

  const isCanvasConnected = profile?.canvas_token || profile?.canvas_calendar_url;

  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded w-1/4"></div>
              <div className="h-4 bg-gray-100 rounded w-1/2 mt-2"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="h-10 bg-gray-100 rounded"></div>
                <div className="h-10 bg-gray-100 rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>
            Manage your personal information and preferences
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              value={profile?.email || ""}
              disabled
              className="bg-gray-50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="timezone">Timezone</Label>
            <Select value={timezone} onValueChange={setTimezone}>
              <SelectTrigger>
                <SelectValue placeholder="Select timezone" />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handleSaveProfile} disabled={isUpdating}>
            {isUpdating ? "Saving..." : "Save Profile"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Google Integration</CardTitle>
          <CardDescription>
            Sync with Google Classroom and Gmail
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-green-50 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Check className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-900">Connected</p>
                  <p className="text-sm text-green-700">
                    {user?.email}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnectGoogle}
                disabled={isDisconnecting}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4 mr-2" />
                {isDisconnecting ? "Disconnecting..." : "Disconnect"}
              </Button>
            </div>
          </div>

          <div className="border rounded-lg">
            <button
              onClick={() => setShowScopes(!showScopes)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">Permissions Granted</span>
                <Badge variant="secondary">{GOOGLE_SCOPES.length} scopes</Badge>
              </div>
              {showScopes ? (
                <ChevronUp className="h-4 w-4 text-gray-500" />
              ) : (
                <ChevronDown className="h-4 w-4 text-gray-500" />
              )}
            </button>

            {showScopes && (
              <div className="border-t px-4 py-3 space-y-3">
                {GOOGLE_SCOPES.map((scope) => (
                  <div key={scope.scope} className="flex items-start gap-3">
                    <Check className="h-4 w-4 text-green-500 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">{scope.label}</p>
                      <p className="text-xs text-gray-500">{scope.description}</p>
                    </div>
                  </div>
                ))}
                <div className="pt-2 border-t">
                  <p className="text-xs text-gray-500">
                    To modify permissions, disconnect and reconnect your Google account.
                    You can also manage app access in your{" "}
                    <a
                      href="https://myaccount.google.com/permissions"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Google Account settings
                    </a>
                    .
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Canvas Integration</CardTitle>
          <CardDescription>
            Connect your Canvas LMS to sync assignments and calendar events
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isCanvasConnected ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-green-50 rounded-lg">
                <Check className="h-5 w-5 text-green-600" />
                <div className="flex-1">
                  <p className="font-medium text-green-900">Connected</p>
                  <p className="text-sm text-green-700">
                    {profile?.canvas_token && profile?.canvas_calendar_url ? (
                      <>via Calendar URL + API Token</>
                    ) : profile?.canvas_token ? (
                      <>via API Token ({profile.canvas_base_url})</>
                    ) : (
                      <>via Calendar URL</>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSyncCanvas}
                    disabled={isSyncing}
                  >
                    <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? "animate-spin" : ""}`} />
                    {isSyncing ? "Syncing..." : "Sync Now"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDisconnectCanvas}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Disconnect
                  </Button>
                </div>
              </div>

              {syncMessage && (
                <div className={`p-3 rounded-lg text-sm ${
                  syncMessage.type === "success"
                    ? "bg-green-50 text-green-800 border border-green-200"
                    : "bg-red-50 text-red-800 border border-red-200"
                }`}>
                  {syncMessage.text}
                </div>
              )}

              {profile?.canvas_calendar_url && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Calendar URL</p>
                  <p className="text-sm font-mono text-gray-700 break-all">
                    {profile.canvas_calendar_url.substring(0, 60)}...
                  </p>
                </div>
              )}

              {/* Show option to add API token when only calendar URL is connected */}
              {profile?.canvas_calendar_url && !profile?.canvas_token && (
                <div className="border rounded-lg">
                  <button
                    onClick={() => setShowAddApiToken(!showAddApiToken)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Key className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium">Add API Token for better course matching</span>
                    </div>
                    {showAddApiToken ? (
                      <ChevronUp className="h-4 w-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-gray-500" />
                    )}
                  </button>

                  {showAddApiToken && (
                    <div className="border-t px-4 py-4 space-y-4">
                      <p className="text-sm text-gray-600">
                        Adding a Canvas API token allows us to look up course names for your calendar items,
                        so they appear under proper course names instead of &quot;Uncategorized&quot;.
                      </p>

                      <div className="space-y-2">
                        <Label htmlFor="canvasUrlAdd">Canvas URL</Label>
                        <Input
                          id="canvasUrlAdd"
                          value={canvasBaseUrl}
                          onChange={(e) => setCanvasBaseUrl(e.target.value)}
                          placeholder="https://yourschool.instructure.com"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="canvasTokenAdd">Access Token</Label>
                        <Input
                          id="canvasTokenAdd"
                          type="password"
                          value={canvasToken}
                          onChange={(e) => setCanvasToken(e.target.value)}
                          placeholder="Paste your Canvas access token"
                        />
                        <p className="text-xs text-gray-500">
                          Go to Canvas &gt; Account &gt; Settings &gt; Approved Integrations &gt; New Access Token
                        </p>
                      </div>

                      <Button
                        onClick={handleSaveCanvasApi}
                        disabled={isUpdating || !canvasBaseUrl || !canvasToken}
                        size="sm"
                      >
                        {isUpdating ? "Saving..." : "Save API Token"}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Show API token status when both are configured */}
              {profile?.canvas_token && (
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">API Token</p>
                  <p className="text-sm text-gray-700">
                    Connected to {profile.canvas_base_url}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <Tabs value={canvasMethod} onValueChange={(v) => setCanvasMethod(v as "calendar" | "api")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="calendar" className="flex items-center gap-2">
                  <Link className="h-4 w-4" />
                  Calendar URL
                </TabsTrigger>
                <TabsTrigger value="api" className="flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  API Token
                </TabsTrigger>
              </TabsList>

              <TabsContent value="calendar" className="space-y-4 mt-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium">How to get your Canvas Calendar URL:</p>
                      <ol className="list-decimal list-inside mt-2 space-y-1">
                        <li>Log into your Canvas account</li>
                        <li>Go to <strong>Calendar</strong> in the left sidebar</li>
                        <li>Click <strong>Calendar Feed</strong> at the bottom right</li>
                        <li>Copy the URL that appears</li>
                      </ol>
                      <p className="mt-2 text-xs text-blue-600">
                        This is the easiest method and doesn&apos;t require any special permissions.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="canvasCalendarUrl">Calendar Feed URL</Label>
                  <Input
                    id="canvasCalendarUrl"
                    value={canvasCalendarUrl}
                    onChange={(e) => setCanvasCalendarUrl(e.target.value)}
                    placeholder="https://yourschool.instructure.com/feeds/calendars/..."
                  />
                  <p className="text-xs text-gray-500">
                    The URL should end with .ics and contain &quot;feeds/calendars&quot;
                  </p>
                </div>

                <Button
                  onClick={handleSaveCanvasCalendar}
                  disabled={isUpdating || !canvasCalendarUrl}
                >
                  {isUpdating ? "Connecting..." : "Connect with Calendar URL"}
                </Button>
              </TabsContent>

              <TabsContent value="api" className="space-y-4 mt-4">
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-medium">How to get your Canvas API Token:</p>
                      <ol className="list-decimal list-inside mt-2 space-y-1">
                        <li>Log into your Canvas account</li>
                        <li>Go to <strong>Account &gt; Settings</strong></li>
                        <li>Scroll to <strong>Approved Integrations</strong></li>
                        <li>Click <strong>New Access Token</strong></li>
                        <li>Copy and paste the token below</li>
                      </ol>
                      <p className="mt-2 text-xs text-yellow-600">
                        This method provides more detailed assignment information.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="canvasUrl">Canvas URL</Label>
                  <Input
                    id="canvasUrl"
                    value={canvasBaseUrl}
                    onChange={(e) => setCanvasBaseUrl(e.target.value)}
                    placeholder="https://yourschool.instructure.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="canvasToken">Access Token</Label>
                  <Input
                    id="canvasToken"
                    type="password"
                    value={canvasToken}
                    onChange={(e) => setCanvasToken(e.target.value)}
                    placeholder="Paste your Canvas access token"
                  />
                </div>

                <Button
                  onClick={handleSaveCanvasApi}
                  disabled={isUpdating || !canvasBaseUrl || !canvasToken}
                >
                  {isUpdating ? "Connecting..." : "Connect with API Token"}
                </Button>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {saveStatus === "success" && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg">
          Settings saved successfully!
        </div>
      )}
    </div>
  );
}
