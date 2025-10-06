import React, { useState } from 'react';
import { Search, Database, Video, TrendingUp, Check, Plus, Calendar, User, Clock } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import NavigationHeader from './NavigationHeader';

const RepositorySearchView = ({ onNavigate }) => {
  const [searchQuery, setSearchQuery] = useState('');

  const sampleNuggets = [
    {
      id: 1,
      observation: "Users struggle to find profile settings in the navigation",
      evidence_text: "I clicked around for like 2-3 minutes before I found it buried in a dropdown menu",
      session_title: "Mobile Navigation Test - Sarah M.",
      session_date: "2024-03-15",
      speaker: "Participant",
      timestamp: "00:02:20",
      tags: ["Navigation Issues", "Mobile", "Profile Settings"],
      sentiment: "frustrated"
    },
    {
      id: 2,
      observation: "Dashboard data visualization is highly appreciated",
      evidence_text: "I love the data visualization - it makes it easy to understand my usage patterns at a glance",
      session_title: "Mobile Navigation Test - Sarah M.",
      session_date: "2024-03-15",
      speaker: "Participant", 
      timestamp: "00:05:12",
      tags: ["Positive Feedback", "Dashboard", "Data Viz"],
      sentiment: "positive"
    },
    {
      id: 3,
      observation: "Onboarding flow causes confusion about account types",
      evidence_text: "I wasn't sure if I was signing up for a personal or business account",
      session_title: "Onboarding Flow Review - John D.",
      session_date: "2024-03-12",
      speaker: "Participant",
      timestamp: "00:01:45", 
      tags: ["Onboarding", "Account Setup", "Confusion"],
      sentiment: "confused"
    }
  ];

  const filteredNuggets = sampleNuggets.filter(nugget =>
    nugget.observation.toLowerCase().includes(searchQuery.toLowerCase()) ||
    nugget.evidence_text.toLowerCase().includes(searchQuery.toLowerCase()) ||
    nugget.session_title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    nugget.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-100 text-green-800 border-green-200';
      case 'frustrated': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'confused': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="bg-background min-h-screen">
      <NavigationHeader currentView="repository" onNavigate={onNavigate} />
      
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Research Repository</h1>
            <p className="text-muted-foreground">Search and discover insights from all your research sessions</p>
          </div>
          <Button
            onClick={() => onNavigate('upload')}
            className="flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Session
          </Button>
        </div>

        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search insights, evidence, sessions, or tags..."
                className="w-full pl-10 text-lg"
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                <div>
                  <div className="text-2xl font-bold text-foreground">{sampleNuggets.length}</div>
                  <div className="text-sm text-muted-foreground">Total Insights</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Video className="w-5 h-5 text-green-600" />
                <div>
                  <div className="text-2xl font-bold text-foreground">3</div>
                  <div className="text-sm text-muted-foreground">Sessions</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-orange-600" />
                <div>
                  <div className="text-2xl font-bold text-foreground">2</div>
                  <div className="text-sm text-muted-foreground">Pain Points</div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Check className="w-5 h-5 text-emerald-600" />
                <div>
                  <div className="text-2xl font-bold text-foreground">1</div>
                  <div className="text-sm text-muted-foreground">Positive</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              {filteredNuggets.length} insights found
            </h2>
          </div>

          {filteredNuggets.map(nugget => (
            <Card key={nugget.id} className="hover:shadow-md transition-shadow">
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
                    <Badge variant="outline" className={getSentimentColor(nugget.sentiment)}>
                      {nugget.sentiment}
                    </Badge>
                    <Button variant="ghost" size="sm" className="flex items-center gap-1">
                      <Video className="w-4 h-4" />
                      Watch
                    </Button>
                  </div>
                </div>

                <div className="bg-muted border-l-4 border-primary p-4 mb-4">
                  <p className="text-muted-foreground italic">"{nugget.evidence_text}"</p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap gap-2">
                    {nugget.tags.map(tag => (
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
          ))}

          {filteredNuggets.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No insights found</p>
              <p className="text-sm">Try adjusting your search terms.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RepositorySearchView;
