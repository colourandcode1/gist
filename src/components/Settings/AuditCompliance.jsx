import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Download, Filter, Calendar } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getAuditLogs } from '@/lib/firestoreUtils';

const AuditCompliance = () => {
  const { currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [auditFilters, setAuditFilters] = useState({
    user: '',
    actionType: 'all',
    resourceType: 'all',
    dateFrom: '',
    dateTo: ''
  });

  const [auditLogs, setAuditLogs] = useState([]);
  const [exportOptions, setExportOptions] = useState({
    format: 'csv',
    includeTranscripts: false,
    includeComments: true,
    dateRange: 'all'
  });

  useEffect(() => {
    if (currentUser) {
      loadAuditLogs();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.uid, auditFilters.actionType, auditFilters.resourceType, auditFilters.dateFrom, auditFilters.dateTo]);

  const loadAuditLogs = async () => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const filters = {
        userId: auditFilters.user || currentUser.uid,
        actionType: auditFilters.actionType,
        resourceType: auditFilters.resourceType,
        dateFrom: auditFilters.dateFrom,
        dateTo: auditFilters.dateTo
      };

      const logs = await getAuditLogs(currentUser.uid, filters, 100);
      setAuditLogs(logs);
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      // Convert audit logs to CSV format
      let csvContent = 'Timestamp,User,Action,Resource Type,Details\n';
      
      auditLogs.forEach((log) => {
        const timestamp = new Date(log.timestamp).toLocaleString();
        const user = `"${log.userEmail || log.userId}"`;
        const action = `"${log.action}"`;
        const resourceType = `"${log.resourceType}"`;
        const details = `"${(log.details || '').replace(/"/g, '""')}"`;
        
        csvContent += `${timestamp},${user},${action},${resourceType},${details}\n`;
      });

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting audit logs:', error);
      alert('Failed to export audit logs');
    }
  };

  return (
    <div className="space-y-6">
      {/* Audit Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Audit Logs
          </CardTitle>
          <CardDescription>View all activity and changes in your workspace</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg bg-muted/50">
            <div className="space-y-2">
              <label className="text-sm font-medium">User</label>
              <Input
                value={auditFilters.user}
                onChange={(e) => setAuditFilters({ ...auditFilters, user: e.target.value })}
                placeholder="Filter by user"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Action Type</label>
              <select
                value={auditFilters.actionType}
                onChange={(e) => setAuditFilters({ ...auditFilters, actionType: e.target.value })}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              >
                <option value="all">All Actions</option>
                <option value="create">Create</option>
                <option value="update">Update</option>
                <option value="delete">Delete</option>
                <option value="view">View</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Resource Type</label>
              <select
                value={auditFilters.resourceType}
                onChange={(e) => setAuditFilters({ ...auditFilters, resourceType: e.target.value })}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
              >
                <option value="all">All Resources</option>
                <option value="session">Session</option>
                <option value="project">Project</option>
                <option value="theme">Theme</option>
                <option value="insight">Insight</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={auditFilters.dateFrom}
                  onChange={(e) => setAuditFilters({ ...auditFilters, dateFrom: e.target.value })}
                  className="flex-1"
                />
                <Input
                  type="date"
                  value={auditFilters.dateTo}
                  onChange={(e) => setAuditFilters({ ...auditFilters, dateTo: e.target.value })}
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          {/* Audit Log Table */}
          <div className="border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium">Timestamp</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">User</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Action</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Resource</th>
                    <th className="px-4 py-3 text-left text-sm font-medium">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan="5" className="px-4 py-8 text-center text-muted-foreground">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                        <p className="mt-2">Loading audit logs...</p>
                      </td>
                    </tr>
                  ) : auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-4 py-8 text-center text-muted-foreground">
                        No audit logs found.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="border-t">
                        <td className="px-4 py-3 text-sm">{new Date(log.timestamp).toLocaleString()}</td>
                        <td className="px-4 py-3 text-sm">{log.userEmail || log.userId}</td>
                        <td className="px-4 py-3 text-sm">{log.action}</td>
                        <td className="px-4 py-3 text-sm">{log.resourceType}</td>
                        <td className="px-4 py-3 text-sm text-muted-foreground">{log.details}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <Button variant="outline" className="w-full" onClick={handleExport} disabled={isLoading || auditLogs.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Export Audit Logs
          </Button>
        </CardContent>
      </Card>

      {/* Compliance Reports */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Compliance Reports
          </CardTitle>
          <CardDescription>Generate compliance reports for GDPR, HIPAA, and other regulations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button variant="outline" className="h-auto py-4 flex flex-col items-start">
              <div className="font-medium mb-1">GDPR Report</div>
              <div className="text-sm text-muted-foreground">Data processing and privacy compliance</div>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col items-start">
              <div className="font-medium mb-1">HIPAA Report</div>
              <div className="text-sm text-muted-foreground">Healthcare data compliance</div>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col items-start">
              <div className="font-medium mb-1">Data Processing Records</div>
              <div className="text-sm text-muted-foreground">Complete data processing history</div>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex flex-col items-start">
              <div className="font-medium mb-1">Custom Report</div>
              <div className="text-sm text-muted-foreground">Generate custom compliance report</div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Export */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Data Export
          </CardTitle>
          <CardDescription>Export all your data in various formats</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Export Format</label>
            <select
              value={exportOptions.format}
              onChange={(e) => setExportOptions({ ...exportOptions, format: e.target.value })}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
            >
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
              <option value="xlsx">Excel (XLSX)</option>
            </select>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Include Transcripts</div>
                <div className="text-sm text-muted-foreground">Export full transcript content</div>
              </div>
              <input
                type="checkbox"
                checked={exportOptions.includeTranscripts}
                onChange={(e) => setExportOptions({ ...exportOptions, includeTranscripts: e.target.checked })}
                className="h-4 w-4"
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Include Comments</div>
                <div className="text-sm text-muted-foreground">Export comments and annotations</div>
              </div>
              <input
                type="checkbox"
                checked={exportOptions.includeComments}
                onChange={(e) => setExportOptions({ ...exportOptions, includeComments: e.target.checked })}
                className="h-4 w-4"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Date Range</label>
            <select
              value={exportOptions.dateRange}
              onChange={(e) => setExportOptions({ ...exportOptions, dateRange: e.target.value })}
              className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
            >
              <option value="all">All Data</option>
              <option value="last30">Last 30 Days</option>
              <option value="last90">Last 90 Days</option>
              <option value="lastYear">Last Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleExport} className="flex-1">
              <Download className="w-4 h-4 mr-2" />
              Export Data
            </Button>
            <Button variant="outline">Schedule Export</Button>
          </div>

          <div className="border-t pt-4">
            <div className="text-sm font-medium mb-2">Export History</div>
            <div className="text-sm text-muted-foreground">
              Export history will be displayed here once exports are implemented.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuditCompliance;

