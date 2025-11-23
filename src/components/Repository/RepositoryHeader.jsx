import React from 'react';
import { Plus, Search } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export const RepositoryHeader = ({ searchQuery, onSearchChange, onNewSession }) => {
  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Research Repository</h1>
          <p className="text-sm text-muted-foreground">Search and discover insights from all your research sessions</p>
        </div>
        <Button
          onClick={onNewSession}
          className="flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          New Session
        </Button>
      </div>
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search insights, evidence, sessions, or tags..."
              className="w-full pl-10 text-lg"
            />
          </div>
        </CardContent>
      </Card>
    </>
  );
};
