import React from 'react';
import { ThemeProvider } from "@/components/theme-provider";
import SimplifiedUpload from "@/components/SimplifiedUpload";

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="research-hub-theme">
      <SimplifiedUpload />
    </ThemeProvider>
  );
}

export default App;