import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Settings, User, Book, Tag, X, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getResearchConfiguration, updateResearchConfiguration } from '@/lib/firestoreUtils';

const ResearchConfiguration = () => {
  const { currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const [participantFields, setParticipantFields] = useState([
    { id: 'companyName', label: 'Company Name', enabled: true, required: false },
    { id: 'companySize', label: 'Company Size', enabled: true, required: false },
    { id: 'userRole', label: 'User Role', enabled: true, required: false },
    { id: 'industry', label: 'Industry', enabled: true, required: false },
    { id: 'productTenure', label: 'Product Tenure', enabled: true, required: false },
    { id: 'userType', label: 'User Type', enabled: true, required: false }
  ]);

  const [customFields, setCustomFields] = useState([]);
  const [newCustomField, setNewCustomField] = useState('');

  const [dictionaries, setDictionaries] = useState({
    industryTerms: '',
    companyTerms: '',
    productNames: '',
    acronyms: ''
  });

  const [categories, setCategories] = useState([
    'Pain Points',
    'Feature Requests',
    'Positive Feedback',
    'Workarounds',
    'Competitive Insights'
  ]);
  const [newCategory, setNewCategory] = useState('');

  const [tags, setTags] = useState([
    { name: 'UX', color: '#3b82f6', group: 'General' },
    { name: 'Performance', color: '#10b981', group: 'Technical' },
    { name: 'Security', color: '#ef4444', group: 'Technical' }
  ]);
  const [newTag, setNewTag] = useState({ name: '', color: '#3b82f6', group: 'General' });

  useEffect(() => {
    if (currentUser) {
      loadConfiguration();
    } else {
      setIsLoading(false);
    }
  }, [currentUser?.uid]);

  const loadConfiguration = async () => {
    if (!currentUser) {
      setIsLoading(false);
      return;
    }

    try {
      const config = await getResearchConfiguration(currentUser.uid);
      if (config) {
        if (config.participantFields) setParticipantFields(config.participantFields);
        if (config.customFields) setCustomFields(config.customFields);
        if (config.dictionaries) {
          // Convert arrays to comma-separated strings for display
          setDictionaries({
            industryTerms: Array.isArray(config.dictionaries.industryTerms) 
              ? config.dictionaries.industryTerms.join(', ') 
              : config.dictionaries.industryTerms || '',
            companyTerms: Array.isArray(config.dictionaries.companyTerms)
              ? config.dictionaries.companyTerms.join(', ')
              : config.dictionaries.companyTerms || '',
            productNames: Array.isArray(config.dictionaries.productNames)
              ? config.dictionaries.productNames.join(', ')
              : config.dictionaries.productNames || '',
            acronyms: Array.isArray(config.dictionaries.acronyms)
              ? config.dictionaries.acronyms.join(', ')
              : config.dictionaries.acronyms || ''
          });
        }
        if (config.categories) setCategories(config.categories);
        if (config.tags) setTags(config.tags);
      }
    } catch (error) {
      console.error('Error loading research configuration:', error);
      setMessage({ type: 'error', text: 'Failed to load research configuration' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveConfiguration = async () => {
    if (!currentUser) return;

    setIsSaving(true);
    setMessage({ type: '', text: '' });

    try {
      // Convert dictionary strings back to arrays
      const dictionariesData = {
        industryTerms: dictionaries.industryTerms ? dictionaries.industryTerms.split(',').map(s => s.trim()).filter(s => s) : [],
        companyTerms: dictionaries.companyTerms ? dictionaries.companyTerms.split(',').map(s => s.trim()).filter(s => s) : [],
        productNames: dictionaries.productNames ? dictionaries.productNames.split(',').map(s => s.trim()).filter(s => s) : [],
        acronyms: dictionaries.acronyms ? dictionaries.acronyms.split(',').map(s => s.trim()).filter(s => s) : []
      };

      const result = await updateResearchConfiguration(currentUser.uid, {
        participantFields,
        customFields,
        dictionaries: dictionariesData,
        categories,
        tags
      });

      if (result.success) {
        setMessage({ type: 'success', text: 'Research configuration saved successfully' });
      } else {
        setMessage({ type: 'error', text: result.error || 'Failed to save research configuration' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to save research configuration' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleField = (fieldId) => {
    setParticipantFields(fields =>
      fields.map(field =>
        field.id === fieldId ? { ...field, enabled: !field.enabled } : field
      )
    );
  };

  const handleToggleRequired = (fieldId) => {
    setParticipantFields(fields =>
      fields.map(field =>
        field.id === fieldId ? { ...field, required: !field.required } : field
      )
    );
  };

  const handleAddCustomField = () => {
    if (newCustomField.trim()) {
      setCustomFields([...customFields, { id: Date.now(), name: newCustomField, enabled: true, required: false }]);
      setNewCustomField('');
    }
  };

  const handleRemoveCustomField = (fieldId) => {
    setCustomFields(customFields.filter(f => f.id !== fieldId));
  };

  const handleAddCategory = () => {
    if (newCategory.trim() && !categories.includes(newCategory)) {
      setCategories([...categories, newCategory]);
      setNewCategory('');
    }
  };

  const handleRemoveCategory = (category) => {
    setCategories(categories.filter(c => c !== category));
  };

  const handleAddTag = () => {
    if (newTag.name.trim() && !tags.find(t => t.name === newTag.name)) {
      setTags([...tags, { ...newTag, id: Date.now() }]);
      setNewTag({ name: '', color: '#3b82f6', group: 'General' });
    }
  };

  const handleRemoveTag = (tagName) => {
    setTags(tags.filter(t => t.name !== tagName));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
          <p className="text-muted-foreground">Loading research configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Participant Context Fields */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Participant Context Fields
          </CardTitle>
          <CardDescription>Configure which participant information fields to collect</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {participantFields.map((field) => (
            <div key={field.id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex-1">
                <div className="font-medium">{field.label}</div>
                <div className="text-sm text-muted-foreground">Field ID: {field.id}</div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Required</span>
                  <Switch
                    checked={field.required}
                    onCheckedChange={() => handleToggleRequired(field.id)}
                    disabled={!field.enabled}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Enabled</span>
                  <Switch
                    checked={field.enabled}
                    onCheckedChange={() => handleToggleField(field.id)}
                  />
                </div>
              </div>
            </div>
          ))}

          <div className="border-t pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Custom Fields</label>
              <div className="flex gap-2">
                <Input
                  value={newCustomField}
                  onChange={(e) => setNewCustomField(e.target.value)}
                  placeholder="Field name"
                  onKeyPress={(e) => e.key === 'Enter' && handleAddCustomField()}
                />
                <Button onClick={handleAddCustomField}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
            {customFields.length > 0 && (
              <div className="mt-3 space-y-2">
                {customFields.map((field) => (
                  <div key={field.id} className="flex items-center justify-between p-2 border rounded">
                    <span>{field.name}</span>
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveCustomField(field.id)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Custom Dictionaries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Book className="w-5 h-5" />
            Custom Dictionaries
          </CardTitle>
          <CardDescription>Define industry-specific terms and terminology</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Industry Terms</label>
            <Input
              placeholder="Add industry-specific terms (comma-separated)"
              value={dictionaries.industryTerms}
              onChange={(e) => setDictionaries({ ...dictionaries, industryTerms: e.target.value })}
            />
            <p className="text-xs text-muted-foreground">Terms will be recognized in transcripts and insights</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Company-Specific Terms</label>
            <Input
              placeholder="Add company-specific terms (comma-separated)"
              value={dictionaries.companyTerms}
              onChange={(e) => setDictionaries({ ...dictionaries, companyTerms: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Product Names</label>
            <Input
              placeholder="Add product names (comma-separated)"
              value={dictionaries.productNames}
              onChange={(e) => setDictionaries({ ...dictionaries, productNames: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Acronyms</label>
            <Input
              placeholder="Add acronyms and their meanings (e.g., API: Application Programming Interface)"
              value={dictionaries.acronyms}
              onChange={(e) => setDictionaries({ ...dictionaries, acronyms: e.target.value })}
            />
          </div>
          <Button onClick={handleSaveConfiguration} disabled={isSaving}>
            {isSaving ? 'Saving...' : 'Save Dictionaries'}
          </Button>
        </CardContent>
      </Card>

      {/* Categories Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Categories Management
          </CardTitle>
          <CardDescription>Manage default and custom insight categories</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                placeholder="Category name"
                onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
              />
            <Button onClick={handleAddCategory}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((category) => (
              <Badge key={category} variant="secondary" className="flex items-center gap-1">
                {category}
                <button
                  onClick={() => handleRemoveCategory(category)}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tags Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5" />
            Tags Management
          </CardTitle>
          <CardDescription>Create and organize tags for insights</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <Input
              value={newTag.name}
              onChange={(e) => setNewTag({ ...newTag, name: e.target.value })}
              placeholder="Tag name"
            />
            <Input
              type="color"
              value={newTag.color}
              onChange={(e) => setNewTag({ ...newTag, color: e.target.value })}
              className="h-9"
            />
            <select
              value={newTag.group}
              onChange={(e) => setNewTag({ ...newTag, group: e.target.value })}
              className="flex h-9 rounded-md border border-input bg-background px-3 py-1 text-sm"
            >
              <option value="General">General</option>
              <option value="Technical">Technical</option>
              <option value="Business">Business</option>
            </select>
          </div>
          <Button onClick={handleAddTag}>Add Tag</Button>

          <div className="space-y-2">
            <label className="text-sm font-medium">Existing Tags</label>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <Badge
                  key={tag.name}
                  style={{ backgroundColor: tag.color, color: 'white' }}
                  className="flex items-center gap-1"
                >
                  {tag.name}
                  <span className="text-xs opacity-75">({tag.group})</span>
                  <button
                    onClick={() => handleRemoveTag(tag.name)}
                    className="ml-1 hover:opacity-75"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save All Button */}
      <div className="flex justify-end">
        <Button onClick={handleSaveConfiguration} disabled={isSaving} size="lg">
          {isSaving ? 'Saving...' : 'Save All Configuration'}
        </Button>
      </div>

      {/* Message Display */}
      {message.text && (
        <div className={`p-4 rounded-md ${
          message.type === 'success' ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200' :
          message.type === 'error' ? 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200' :
          'bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-200'
        }`}>
          {message.text}
        </div>
      )}
    </div>
  );
};

export default ResearchConfiguration;

