import React, { useState, useEffect } from 'react';
import { X, Copy, Check, Trash2, Eye, Edit } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  createShareLink,
  getShareLinks,
  deleteShareLink
} from '@/lib/firestoreUtils';
import { useAuth } from '@/contexts/AuthContext';

const ShareDialog = ({ themeId, onClose }) => {
  const { currentUser } = useAuth();
  const [shareLinks, setShareLinks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const [newLinkData, setNewLinkData] = useState({
    password: '',
    expiresAt: '',
    permission: 'view',
    requirePassword: false,
    requireExpiration: false
  });

  useEffect(() => {
    if (themeId && currentUser) {
      loadShareLinks();
    }
  }, [themeId, currentUser]);

  const loadShareLinks = async () => {
    setIsLoading(true);
    try {
      const links = await getShareLinks(themeId, currentUser.uid);
      setShareLinks(links);
    } catch (error) {
      console.error('Error loading share links:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateLink = async () => {
    if (!currentUser) return;

    setIsCreating(true);
    try {
      const shareData = {
        password: newLinkData.requirePassword ? newLinkData.password : null,
        expiresAt: newLinkData.requireExpiration ? newLinkData.expiresAt : null,
        permission: newLinkData.permission
      };

      const result = await createShareLink(themeId, shareData, currentUser.uid);
      if (result.success) {
        // Generate the full share URL
        const shareUrl = `${window.location.origin}/themes/${themeId}?share=${result.shareToken}`;
        
        // Reset form
        setNewLinkData({
          password: '',
          expiresAt: '',
          permission: 'view',
          requirePassword: false,
          requireExpiration: false
        });

        // Reload links
        await loadShareLinks();

        // Copy to clipboard
        navigator.clipboard.writeText(shareUrl);
        alert('Share link created and copied to clipboard!');
      } else {
        alert(`Failed to create share link: ${result.error}`);
      }
    } catch (error) {
      console.error('Error creating share link:', error);
      alert('Failed to create share link');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCopyLink = async (shareToken) => {
    const shareUrl = `${window.location.origin}/themes/${themeId}?share=${shareToken}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedId(shareToken);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error('Error copying link:', error);
      alert('Failed to copy link');
    }
  };

  const handleDeleteLink = async (shareLinkId) => {
    if (!window.confirm('Are you sure you want to delete this share link?')) {
      return;
    }

    if (!currentUser) return;

    try {
      const result = await deleteShareLink(shareLinkId, currentUser.uid);
      if (result.success) {
        await loadShareLinks();
      } else {
        alert(`Failed to delete share link: ${result.error}`);
      }
    } catch (error) {
      console.error('Error deleting share link:', error);
      alert('Failed to delete share link');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const isExpired = (expiresAt) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Share Problem Space</CardTitle>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Create New Link Form */}
          <div className="space-y-4 p-4 border rounded-lg">
            <h3 className="font-semibold">Create New Share Link</h3>
            
            <div className="space-y-2">
              <Label>Permission</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="view"
                    checked={newLinkData.permission === 'view'}
                    onChange={(e) => setNewLinkData({ ...newLinkData, permission: e.target.value })}
                  />
                  <Eye className="w-4 h-4" />
                  <span>View Only</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    value="edit"
                    checked={newLinkData.permission === 'edit'}
                    onChange={(e) => setNewLinkData({ ...newLinkData, permission: e.target.value })}
                  />
                  <Edit className="w-4 h-4" />
                  <span>Can Edit</span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="require-password">Password Protection</Label>
              <Switch
                id="require-password"
                checked={newLinkData.requirePassword}
                onCheckedChange={(checked) =>
                  setNewLinkData({ ...newLinkData, requirePassword: checked })
                }
              />
            </div>
            {newLinkData.requirePassword && (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={newLinkData.password}
                  onChange={(e) =>
                    setNewLinkData({ ...newLinkData, password: e.target.value })
                  }
                  placeholder="Enter password"
                />
              </div>
            )}

            <div className="flex items-center justify-between">
              <Label htmlFor="require-expiration">Set Expiration</Label>
              <Switch
                id="require-expiration"
                checked={newLinkData.requireExpiration}
                onCheckedChange={(checked) =>
                  setNewLinkData({ ...newLinkData, requireExpiration: checked })
                }
              />
            </div>
            {newLinkData.requireExpiration && (
              <div className="space-y-2">
                <Label htmlFor="expires-at">Expires At</Label>
                <Input
                  id="expires-at"
                  type="datetime-local"
                  value={newLinkData.expiresAt}
                  onChange={(e) =>
                    setNewLinkData({ ...newLinkData, expiresAt: e.target.value })
                  }
                />
              </div>
            )}

            <Button onClick={handleCreateLink} disabled={isCreating} className="w-full">
              {isCreating ? 'Creating...' : 'Create Share Link'}
            </Button>
          </div>

          {/* Existing Share Links */}
          <div className="space-y-4">
            <h3 className="font-semibold">Active Share Links</h3>
            {isLoading ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-muted-foreground mt-2">Loading...</p>
              </div>
            ) : shareLinks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No share links created yet
              </p>
            ) : (
              <div className="space-y-3">
                {shareLinks.map((link) => {
                  const expired = isExpired(link.expiresAt);
                  return (
                    <Card key={link.id} className={expired ? 'opacity-60' : ''}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge variant={link.permission === 'edit' ? 'default' : 'secondary'}>
                                {link.permission === 'edit' ? (
                                  <>
                                    <Edit className="w-3 h-3 mr-1" />
                                    Can Edit
                                  </>
                                ) : (
                                  <>
                                    <Eye className="w-3 h-3 mr-1" />
                                    View Only
                                  </>
                                )}
                              </Badge>
                              {link.password && (
                                <Badge variant="outline">Password Protected</Badge>
                              )}
                              {expired && <Badge variant="destructive">Expired</Badge>}
                            </div>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <p>Created: {formatDate(link.createdAt)}</p>
                              {link.expiresAt && (
                                <p>Expires: {formatDate(link.expiresAt)}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <Input
                                value={`${window.location.origin}/themes/${themeId}?share=${link.shareToken}`}
                                readOnly
                                className="text-xs font-mono"
                              />
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCopyLink(link.shareToken)}
                              >
                                {copiedId === link.shareToken ? (
                                  <Check className="w-4 h-4" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteLink(link.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ShareDialog;

