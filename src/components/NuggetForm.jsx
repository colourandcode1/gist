import React, { useState } from 'react';
import { Plus, Save, Clock, User } from 'lucide-react';
import { CATEGORIES } from '@/lib/constants';

/**
 * Component for creating and editing research nuggets
 */
const NuggetForm = ({
  selectedText,
  newNugget,
  setNewNugget,
  categories,
  tags,
  setTags,
  isCreatingTag,
  setIsCreatingTag,
  newTagName,
  setNewTagName,
  newTagColor,
  setNewTagColor,
  editingExisting,
  onCreateNugget,
  onSaveExisting,
  sessionData,
  isSaving = false
}) => {
  const addTagToNugget = (tagId) => {
    if (!newNugget.tags.includes(tagId)) {
      setNewNugget(prev => ({
        ...prev,
        tags: [...prev.tags, tagId]
      }));
    }
  };

  const removeTagFromNugget = (tagId) => {
    setNewNugget(prev => ({
      ...prev,
      tags: prev.tags.filter(id => id !== tagId)
    }));
  };

  const createNewTag = () => {
    if (!newTagName.trim()) return;

    const newTag = {
      id: Date.now(),
      name: newTagName.trim(),
      color: newTagColor
    };

    setTags(prev => [...prev, newTag]);
    setNewTagName('');
    setNewTagColor('#6b7280');
    setIsCreatingTag(false);
    
    // Automatically add the new tag to the current nugget
    addTagToNugget(newTag.id);
  };

  const cancelCreateTag = () => {
    setNewTagName('');
    setNewTagColor('#6b7280');
    setIsCreatingTag(false);
  };

  const selectedCategory = categories.find(c => c.id === newNugget.category);

  return (
    <div className="bg-card rounded-lg border border-border p-4 shadow-sm border-dashed border-primary/30 nugget-form">
      <div className="mb-3">
        <div className="flex items-start justify-between mb-2">
          <textarea
            value={newNugget.observation}
            onChange={(e) => setNewNugget(prev => ({ ...prev, observation: e.target.value }))}
            placeholder="What's the key insight?"
            className="w-full text-sm font-medium text-foreground bg-transparent border-none resize-none focus:outline-none placeholder:text-muted-foreground"
            rows="2"
          />
          <div className="flex items-center gap-2 ml-2 flex-shrink-0">
            {newNugget.timestamp && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span className="text-primary">
                  {newNugget.timestamp}
                </span>
              </div>
            )}
            {selectedCategory && (
              <span
                className="px-2 py-1 text-xs rounded-full font-medium"
                style={{ 
                  backgroundColor: `${selectedCategory.color}15`,
                  color: selectedCategory.color,
                  border: `1px solid ${selectedCategory.color}30`
                }}
              >
                {selectedCategory.name}
              </span>
            )}
          </div>
        </div>
        
        <div className="bg-muted border-l-4 border-primary p-3 mb-3">
          {selectedText ? (
            <p className="text-sm text-foreground italic">"{selectedText}"</p>
          ) : (
            <p className="text-sm text-muted-foreground italic">Select text from the transcript to create an insight...</p>
          )}
          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
            <User className="w-3 h-3" />
            <input
              type="text"
              value={newNugget.speaker || sessionData.participantName || 'Participant'}
              onChange={(e) => setNewNugget(prev => ({ ...prev, speaker: e.target.value }))}
              className="bg-transparent border-none text-xs text-muted-foreground focus:outline-none"
              placeholder="Speaker name"
            />
          </div>
        </div>

        {/* Category Selection */}
        <div className="mb-3">
          <label className="text-xs font-medium text-secondary-text mb-2 block">Category</label>
          <div className="flex flex-wrap gap-1">
            {categories.map(category => (
              <button
                key={category.id}
                onClick={() => setNewNugget(prev => ({ 
                  ...prev, 
                  category: prev.category === category.id ? 'general' : category.id 
                }))}
                className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                  newNugget.category === category.id
                    ? 'font-medium'
                    : 'hover:bg-muted'
                }`}
                style={newNugget.category === category.id ? {
                  backgroundColor: `${category.color}15`,
                  color: category.color,
                  border: `1px solid ${category.color}30`
                } : {
                  backgroundColor: 'transparent',
                  color: 'var(--muted-foreground)',
                  border: '1px solid var(--border)'
                }}
              >
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Tags Selection */}
        <div className="mb-3">
          <label className="text-xs font-medium text-secondary-text mb-2 block">Tags</label>
          <div className="flex flex-wrap gap-1">
            {tags.map(tag => (
              <button
                key={tag.id}
                onClick={() => newNugget.tags.includes(tag.id) 
                  ? removeTagFromNugget(tag.id) 
                  : addTagToNugget(tag.id)
                }
                className={`px-2 py-1 text-xs rounded-full border transition-colors ${
                  newNugget.tags.includes(tag.id)
                    ? 'font-medium'
                    : 'hover:bg-muted'
                }`}
                style={newNugget.tags.includes(tag.id) ? {
                  backgroundColor: `${tag.color}15`,
                  color: tag.color,
                  border: `1px solid ${tag.color}30`
                } : {
                  backgroundColor: 'transparent',
                  color: 'var(--muted-foreground)',
                  border: '1px solid var(--border)'
                }}
              >
                {tag.name}
              </button>
            ))}
            
            {/* Create New Tag Button */}
            {!isCreatingTag && (
              <button
                onClick={() => setIsCreatingTag(true)}
                className="px-2 py-1 text-xs rounded-full border border-dashed border-muted-foreground text-muted-foreground hover:border-primary hover:text-primary transition-colors flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                New Tag
              </button>
            )}
          </div>
        </div>

        {/* Create Tag Form */}
        {isCreatingTag && (
          <div className="bg-muted/30 border border-border rounded-lg p-3 mb-3">
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-secondary-text mb-1 block">Tag Name</label>
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && newTagName.trim()) {
                      createNewTag();
                    } else if (e.key === 'Escape') {
                      cancelCreateTag();
                    }
                  }}
                  placeholder="Enter tag name..."
                  className="w-full px-2 py-1 text-xs border border-border rounded bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  autoFocus
                />
              </div>
              
              <div>
                <label className="text-xs font-medium text-secondary-text mb-1 block">Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={newTagColor}
                    onChange={(e) => setNewTagColor(e.target.value)}
                    className="w-8 h-6 border border-border rounded cursor-pointer"
                  />
                  <span className="text-xs text-muted-foreground">{newTagColor}</span>
                </div>
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={createNewTag}
                  disabled={!newTagName.trim()}
                  className="flex items-center gap-1 px-3 py-1 bg-primary text-primary-foreground text-xs rounded hover:bg-primary/90 disabled:bg-muted disabled:cursor-not-allowed transition-colors"
                >
                  <Plus className="w-3 h-3" />
                  Create Tag
                </button>
                <button
                  onClick={cancelCreateTag}
                  className="px-3 py-1 bg-secondary text-secondary-foreground text-xs rounded hover:bg-secondary/90 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            {new Date().toLocaleString()}
          </div>
          {editingExisting ? (
            <button
              onClick={onSaveExisting}
              disabled={!newNugget.observation.trim() || !selectedText}
              className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground text-sm rounded-md hover:bg-primary/90 disabled:bg-muted disabled:cursor-not-allowed transition-colors"
            >
              <Save className="w-4 h-4" />
              Save Changes
            </button>
          ) : (
            <button
              onClick={onCreateNugget}
              disabled={!newNugget.observation.trim() || !selectedText || isSaving}
              className="flex items-center gap-1 px-3 py-1.5 bg-primary text-primary-foreground text-sm rounded-md hover:bg-primary/90 disabled:bg-muted disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Create Nugget
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NuggetForm;

