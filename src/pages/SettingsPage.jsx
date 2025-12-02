import React, { useState, useEffect } from 'react';
import { useSearchParams, useLocation } from 'react-router-dom';
import NavigationHeader from '@/components/NavigationHeader';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import ProfileSettings from '@/components/Settings/ProfileSettings';
import TeamManagement from '@/components/Settings/TeamManagement';
import ResearchConfiguration from '@/components/Settings/ResearchConfiguration';
import PrivacySecurity from '@/components/Settings/PrivacySecurity';
import Integrations from '@/components/Settings/Integrations';
import AuditCompliance from '@/components/Settings/AuditCompliance';
import Billing from '@/components/Settings/Billing';
import OrganizationSettings from '@/components/Settings/OrganizationSettings';
import { useAuth } from '@/contexts/AuthContext';
import { getPendingRequests } from '@/lib/firestore/organizationRequests';
import { User, Users, Settings as SettingsIcon, Shield, Plug, FileText, CreditCard, Building2 } from 'lucide-react';

const SettingsPage = () => {
  const { currentUser, userProfile, isAdmin, userOrganization } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const tabFromUrl = searchParams.get('tab') || 'profile';
  const [activeTab, setActiveTab] = useState(tabFromUrl);
  const highlightDisplayName = location.state?.highlightDisplayName || false;
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  // Sync URL param changes with active tab state
  useEffect(() => {
    const tab = searchParams.get('tab') || 'profile';
    setActiveTab(tab);
  }, [searchParams]);

  // Load pending requests count for admin users
  useEffect(() => {
    const loadPendingRequestsCount = async () => {
      if (isAdmin() && userOrganization && currentUser) {
        try {
          const requests = await getPendingRequests(userOrganization.id, currentUser.uid);
          setPendingRequestsCount(requests.length);
        } catch (error) {
          console.error('Error loading pending requests count:', error);
        }
      } else {
        setPendingRequestsCount(0);
      }
    };

    loadPendingRequestsCount();
    // Refresh count every 30 seconds
    const interval = setInterval(loadPendingRequestsCount, 30000);
    return () => clearInterval(interval);
  }, [isAdmin, userOrganization, currentUser]);

  // Update URL when tab changes
  const handleTabChange = (value) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };

  if (!currentUser) {
    return (
      <div className="bg-background min-h-screen">
        <NavigationHeader />
        <div className="max-w-7xl mx-auto p-6">
          <p className="text-muted-foreground">Please log in to access settings.</p>
        </div>
      </div>
    );
  }

  const isUserAdmin = isAdmin();

  return (
    <div className="bg-background min-h-screen">
      <NavigationHeader />
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground mb-2">Settings</h1>
          <p className="text-muted-foreground">Manage your account and preferences</p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Profile</span>
            </TabsTrigger>
            {isUserAdmin && (
              <TabsTrigger value="organization" className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                <span className="hidden sm:inline">Organization</span>
              </TabsTrigger>
            )}
            {isUserAdmin && (
              <TabsTrigger value="team" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span className="hidden sm:inline">Team</span>
                {pendingRequestsCount > 0 && (
                  <Badge variant="destructive" className="ml-1 px-1.5 py-0 text-xs">
                    {pendingRequestsCount}
                  </Badge>
                )}
              </TabsTrigger>
            )}
            <TabsTrigger value="research" className="flex items-center gap-2">
              <SettingsIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Research</span>
            </TabsTrigger>
            {isUserAdmin && (
              <TabsTrigger value="privacy" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span className="hidden sm:inline">Privacy</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="integrations" className="flex items-center gap-2">
              <Plug className="w-4 h-4" />
              <span className="hidden sm:inline">Integrations</span>
            </TabsTrigger>
            {isUserAdmin && (
              <TabsTrigger value="audit" className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">Audit</span>
              </TabsTrigger>
            )}
            {isUserAdmin && (
              <TabsTrigger value="billing" className="flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                <span className="hidden sm:inline">Billing</span>
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="profile">
            <ProfileSettings highlightDisplayName={highlightDisplayName} />
          </TabsContent>

          {isUserAdmin && (
            <TabsContent value="organization">
              <OrganizationSettings />
            </TabsContent>
          )}

          {isUserAdmin && (
            <TabsContent value="team">
              <TeamManagement />
            </TabsContent>
          )}

          <TabsContent value="research">
            <ResearchConfiguration />
          </TabsContent>

          {isUserAdmin && (
            <TabsContent value="privacy">
              <PrivacySecurity />
            </TabsContent>
          )}

          <TabsContent value="integrations">
            <Integrations />
          </TabsContent>

          {isUserAdmin && (
            <TabsContent value="audit">
              <AuditCompliance />
            </TabsContent>
          )}

          {isUserAdmin && (
            <TabsContent value="billing">
              <Billing />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </div>
  );
};

export default SettingsPage;
