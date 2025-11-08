import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Settings, User, Book, Tag, X, Plus } from 'lucide-react';

const ResearchConfiguration = () => {
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
    industryTerms: [],
    companyTerms: [],
    productNames: [],
    acronyms: []
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
            <Input placeholder="Add industry-specific terms (comma-separated)" />
            <p className="text-xs text-muted-foreground">Terms will be recognized in transcripts and insights</p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Company-Specific Terms</label>
            <Input placeholder="Add company-specific terms (comma-separated)" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Product Names</label>
            <Input placeholder="Add product names (comma-separated)" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Acronyms</label>
            <Input placeholder="Add acronyms and their meanings (e.g., API: Application Programming Interface)" />
          </div>
          <Button>Save Dictionaries</Button>
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
    </div>
  );
};

export default ResearchConfiguration;

