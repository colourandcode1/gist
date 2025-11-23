import React from 'react';
import { Calendar, User, Clock, Video, Target, Building2, FolderOpen, PenTool } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CATEGORIES } from '@/lib/constants';

/**
 * Component for displaying a nugget card in the repository view
 */
const RepositoryNuggetCard = ({ nugget, session, project, isSelected = false, onNuggetClick, onWatchClick, onAddToTheme }) => {
  const getSentimentColor = (category) => {
    switch (category) {
      case 'sentiment': return 'bg-green-100 text-green-800 border-green-200';
      case 'pain_point': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'usability': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'feature': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'journey': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'performance': return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getParticipantContextBadge = () => {
    if (!session?.participantContext) return null;
    
    const { companySize, userType, userRole, industry } = session.participantContext;
    const parts = [];
    
    if (companySize) {
      const sizeLabels = {
        'smb': 'SMB',
        'mid_market': 'Mid-Market',
        'enterprise': 'Enterprise'
      };
      parts.push(sizeLabels[companySize] || companySize);
    }
    
    if (userType) {
      const typeLabels = {
        'admin': 'Admin',
        'end_user': 'End User',
        'decision_maker': 'Decision Maker'
      };
      parts.push(typeLabels[userType] || userType);
    } else if (userRole) {
      parts.push(userRole);
    }
    
    if (parts.length === 0) return null;
    
    return (
      <Badge variant="outline" className="flex items-center gap-1 text-xs">
        <Building2 className="w-3 h-3" />
        {parts.join(' • ')}
      </Badge>
    );
  };

  return (
    <Card 
      className={`hover:shadow-md transition-all duration-200 ${
        isSelected 
          ? 'border-primary border-2 bg-primary/5 shadow-md' 
          : 'border-border hover:border-primary/50'
      }`}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-2">
          <div className="flex-1">
            <h4 className="font-medium text-foreground mb-2">{nugget.observation}</h4>
            <p 
              className="text-sm text-muted-foreground italic mb-2 cursor-pointer hover:text-foreground transition-colors"
              onClick={(e) => {
                e.stopPropagation();
                if (onNuggetClick) {
                  onNuggetClick(nugget);
                }
              }}
            >"{nugget.evidence_text}"</p>
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <Badge variant="outline" className={getSentimentColor(nugget.category)}>
                {nugget.category.replace('_', ' ')}
              </Badge>
              <span className="text-xs text-muted-foreground">{nugget.session_title}</span>
            </div>
            <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
              {nugget.speaker && (
                <div className="flex items-center gap-1">
                  <User className="w-3 h-3" />
                  <span>Speaker: {nugget.speaker}</span>
                </div>
              )}
              {nugget.createdByName && (
                <div className="flex items-center gap-1">
                  <PenTool className="w-3 h-3" />
                  <span>Created by {nugget.createdByName}</span>
                </div>
              )}
              {nugget.timestamp && (
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {nugget.timestamp}
                </div>
              )}
              {nugget.session_date && (
                <div className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {nugget.session_date}
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 ml-4 flex-wrap">
            {getParticipantContextBadge()}
            {project && (
              <Badge variant="outline" className="flex items-center gap-1 text-xs">
                <FolderOpen className="w-3 h-3" />
                {project.name}
              </Badge>
            )}
            {onAddToTheme && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="flex items-center gap-1"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddToTheme();
                }}
                title="Add to Theme"
              >
                <Target className="w-4 h-4" />
              </Button>
            )}
            {nugget.session_id && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="flex items-center gap-1"
                onClick={(e) => onWatchClick(nugget, e)}
              >
                <Video className="w-4 h-4" />
                Watch
              </Button>
            )}
          </div>
        </div>

        {Array.isArray(nugget.tags) && nugget.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-border">
            {nugget.tags.map(tag => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RepositoryNuggetCard;

