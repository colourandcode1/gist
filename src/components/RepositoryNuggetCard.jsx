import React from 'react';
import { Calendar, User, Clock, Video } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CATEGORIES } from '@/lib/constants';

/**
 * Component for displaying a nugget card in the repository view
 */
const RepositoryNuggetCard = ({ nugget, onNuggetClick, onWatchClick }) => {
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

  return (
    <Card 
      className="hover:shadow-md transition-shadow cursor-pointer hover:border-primary/50"
      onClick={() => onNuggetClick(nugget)}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-medium text-foreground mb-2">{nugget.observation}</h3>
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
              <div className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {nugget.session_date}
              </div>
              <div className="flex items-center gap-1">
                <User className="w-4 h-4" />
                {nugget.speaker}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {nugget.timestamp}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 ml-4">
            <Badge variant="outline" className={getSentimentColor(nugget.category)}>
              {nugget.category.replace('_', ' ')}
            </Badge>
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

        <div className="bg-muted border-l-4 border-primary p-4 mb-4">
          <p className="text-muted-foreground italic">"{nugget.evidence_text}"</p>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex flex-wrap gap-2">
            {Array.isArray(nugget.tags) && nugget.tags.map(tag => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
          
          <div className="text-sm text-muted-foreground">
            from {nugget.session_title}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RepositoryNuggetCard;

