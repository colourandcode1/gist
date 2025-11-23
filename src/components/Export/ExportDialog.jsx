import React, { useState } from 'react';
import { X, FileText, Presentation, FileSpreadsheet, Code, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  exportToPDF,
  exportToCSV,
  exportToPowerPoint,
  generateEmbedCode
} from '@/lib/exportUtils';
import { useAuth } from '@/contexts/AuthContext';

const ExportDialog = ({ themeId, onClose }) => {
  const { currentUser } = useAuth();
  const [exportFormat, setExportFormat] = useState('pdf');
  const [includeComments, setIncludeComments] = useState(false);
  const [includeTranscripts, setIncludeTranscripts] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [embedPlatform, setEmbedPlatform] = useState('notion');
  const [embedCode, setEmbedCode] = useState('');
  const [copied, setCopied] = useState(false);

  const handleExport = async () => {
    if (!currentUser || !themeId) return;

    setIsExporting(true);
    try {
      const options = {
        includeComments,
        includeTranscripts
      };

      switch (exportFormat) {
        case 'pdf':
          await exportToPDF(themeId, currentUser.uid, options);
          break;
        case 'csv':
          await exportToCSV(themeId, currentUser.uid, options);
          break;
        case 'powerpoint':
          await exportToPowerPoint(themeId, currentUser.uid, options);
          break;
        case 'embed':
          const embedResult = await generateEmbedCode(themeId, currentUser.uid, embedPlatform);
          if (embedResult) {
            setEmbedCode(embedResult.code);
          }
          break;
        default:
          alert('Invalid export format');
      }

      if (exportFormat !== 'embed') {
        onClose();
      }
    } catch (error) {
      console.error('Error exporting:', error);
      alert(`Failed to export: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyEmbedCode = async () => {
    if (!embedCode) return;
    try {
      await navigator.clipboard.writeText(embedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Error copying code:', error);
      alert('Failed to copy code');
    }
  };

  const handleGenerateEmbed = async () => {
    if (!currentUser || !themeId) return;

    setIsExporting(true);
    try {
      const embedResult = await generateEmbedCode(themeId, currentUser.uid, embedPlatform);
      if (embedResult) {
        setEmbedCode(embedResult.code);
      }
    } catch (error) {
      console.error('Error generating embed code:', error);
      alert(`Failed to generate embed code: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Export Theme</CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Format Selection */}
          <div className="space-y-4">
            <Label>Export Format</Label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setExportFormat('pdf')}
                className={`p-4 border-2 rounded-lg text-left transition-colors ${
                  exportFormat === 'pdf'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <FileText className="w-6 h-6 mb-2" />
                <div className="font-semibold">PDF</div>
                <div className="text-sm text-muted-foreground">
                  Print-ready document
                </div>
              </button>

              <button
                type="button"
                onClick={() => setExportFormat('csv')}
                className={`p-4 border-2 rounded-lg text-left transition-colors ${
                  exportFormat === 'csv'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <FileSpreadsheet className="w-6 h-6 mb-2" />
                <div className="font-semibold">CSV</div>
                <div className="text-sm text-muted-foreground">
                  Spreadsheet format
                </div>
              </button>

              <button
                type="button"
                onClick={() => setExportFormat('powerpoint')}
                className={`p-4 border-2 rounded-lg text-left transition-colors ${
                  exportFormat === 'powerpoint'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <Presentation className="w-6 h-6 mb-2" />
                <div className="font-semibold">PowerPoint</div>
                <div className="text-sm text-muted-foreground">
                  Presentation format
                </div>
              </button>

              <button
                type="button"
                onClick={() => setExportFormat('embed')}
                className={`p-4 border-2 rounded-lg text-left transition-colors ${
                  exportFormat === 'embed'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/50'
                }`}
              >
                <Code className="w-6 h-6 mb-2" />
                <div className="font-semibold">Embed Code</div>
                <div className="text-sm text-muted-foreground">
                  For Notion/Confluence
                </div>
              </button>
            </div>
          </div>

          {/* Export Options */}
          {exportFormat !== 'embed' && (
            <div className="space-y-4 p-4 border rounded-lg">
              <Label>Export Options</Label>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="include-comments">Include Comments</Label>
                  <p className="text-sm text-muted-foreground">
                    Export comments along with insights
                  </p>
                </div>
                <Switch
                  id="include-comments"
                  checked={includeComments}
                  onCheckedChange={setIncludeComments}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="include-transcripts">Include Transcripts</Label>
                  <p className="text-sm text-muted-foreground">
                    Include full transcript content (PDF only)
                  </p>
                </div>
                <Switch
                  id="include-transcripts"
                  checked={includeTranscripts}
                  onCheckedChange={setIncludeTranscripts}
                  disabled={exportFormat !== 'pdf'}
                />
              </div>
            </div>
          )}

          {/* Embed Code Options */}
          {exportFormat === 'embed' && (
            <div className="space-y-4 p-4 border rounded-lg">
              <Label>Platform</Label>
              <Tabs value={embedPlatform} onValueChange={setEmbedPlatform}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="notion">Notion</TabsTrigger>
                  <TabsTrigger value="confluence">Confluence</TabsTrigger>
                </TabsList>
              </Tabs>

              {embedCode ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Generated Code</Label>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleCopyEmbedCode}
                    >
                      {copied ? (
                        <>
                          <Check className="w-4 h-4 mr-2" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                  <Textarea
                    value={embedCode}
                    readOnly
                    rows={10}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground">
                    {embedPlatform === 'notion'
                      ? 'Copy this markdown and paste it into a Notion page'
                      : 'Copy this HTML and use the HTML macro in Confluence'}
                  </p>
                </div>
              ) : (
                <Button onClick={handleGenerateEmbed} disabled={isExporting}>
                  {isExporting ? 'Generating...' : 'Generate Embed Code'}
                </Button>
              )}
            </div>
          )}

          {/* Export Button */}
          {exportFormat !== 'embed' && (
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={handleExport} disabled={isExporting}>
                {isExporting ? 'Exporting...' : 'Export'}
              </Button>
            </div>
          )}

          {exportFormat === 'embed' && embedCode && (
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ExportDialog;

