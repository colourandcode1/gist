// Landing page content - easily replaceable for customization
export const landingContent = {
  nav: {
    logo: "Gist",
    menuItems: [
      { label: "Product", href: "#product" },
      { label: "About us", href: "#about" },
      { label: "Pricing", href: "#pricing" },
      { label: "FAQ", href: "#faq" },
      { label: "Contact", href: "#contact" }
    ]
  },
  hero: {
    headline: "Privacy-first research repository.",
    subheadline: "The research tool built for teams who need full control over where their sensitive user insights are processed.",
    ctaPrimary: "Get started",
    ctaSecondary: "Gist raises $12M from Roba Ventures"
  },
  features: [
    {
      title: "Your Infrastructure",
      description: "Your transcripts and recordings stay in your Google Drive. We link to them — we never host sensitive data on our servers."
    },
    {
      title: "Privacy-Preserving Analysis",
      description: "Keyword-based sentiment detection runs locally. No API calls, no data leaving your infrastructure."
    },
    {
      title: "Video-Linked Insights",
      description: "Click any insight to jump directly to that moment in your Google Drive recording. No expensive transcription APIs needed."
    },
    {
      title: "Team Collaboration",
      description: "Role-based permissions (Admin, Researcher, Viewer) ensure the right access for everyone on your team."
    }
  ],
  featuresSection: {
    title: "Built for Teams Who Can't Compromise on Control",
    subtitle: "",
    features: [
      {
        icon: "Lock",
        title: "Your Infrastructure",
        description: "Your transcripts and recordings stay in your Google Drive. We link to them — we never host sensitive data on our servers."
      },
      {
        icon: "BarChart3",
        title: "Privacy-Preserving Analysis",
        description: "Keyword-based sentiment detection runs locally. No API calls, no data leaving your infrastructure."
      },
      {
        icon: "Play",
        title: "Video-Linked Insights",
        description: "Click any insight to jump directly to that moment in your Google Drive recording. No expensive transcription APIs needed."
      },
      {
        icon: "Users",
        title: "Team Collaboration",
        description: "Role-based permissions (Admin, Researcher, Viewer) ensure the right access for everyone on your team."
      },
      {
        icon: "FileSearch",
        title: "Audit Logs",
        description: "Complete history of who viewed, edited, or exported any data. Export logs for compliance reporting."
      },
      {
        icon: "Download",
        title: "Full Data Ownership",
        description: "Export everything anytime in standard formats (CSV, JSON). No vendor lock-in."
      }
    ]
  },
  testimonials: [
    {
      quote: "Thanks to Gist, we're finding new leads that we never would have found with legal methods.",
      author: "Amy Chase",
      role: "PM",
      company: "Mercury Finance"
    },
    {
      quote: "Founder Mode is hard enough without having a really nice project management app.",
      author: "Victoria Smith & Henry Vargas",
      role: "Founders",
      company: "Mercury Finance"
    },
    {
      quote: "I was able to replace 80% of my team with Gist bots so I can spend more time on my body.",
      author: "Jonas Kotara",
      role: "Lead Engineer",
      company: "Mercury Finance"
    }
  ],
  pricing: {
    header: "Transparent Pricing. No Hidden AI Costs.",
    note: "No credit card required",
    tiers: [
      {
        name: "Starter",
        price: "$25",
        period: "/month",
        userRange: "1-3 users",
        features: [
          "→ Unlimited transcripts & insights",
          "→ Google Drive video integration",
          "→ Basic audit logs",
          "→ Email support"
        ],
        cta: "Start Free 14-Day Trial"
      },
      {
        name: "Team",
        price: "$120",
        period: "/month",
        userRange: "4-10 users",
        description: "Everything in Starter, plus:",
        features: [
          "→ Advanced audit logs with export",
          "→ Priority support",
          "→ MCP integration (Q1 2026)"
        ],
        cta: "Start Free 14-Day Trial"
      },
      {
        name: "Enterprise",
        price: "Custom pricing",
        userRange: "10+ users",
        description: "Everything in Team, plus:",
        features: [
          "→ SSO integration (coming Q1 2026)",
          "→ Custom compliance features",
          "→ Dedicated account manager",
          "→ Service level agreement"
        ],
        cta: "Start Free 14-Day Trial"
      }
    ]
  },
  faq: [
    {
      question: "Why don't you have built-in AI features?",
      answer: "We believe you should control where your data goes. Many research repositories send your transcripts to third-party AI services (like OpenAI) without making this obvious. We'd rather let you choose your own AI tools via MCP integration, use your on-premise models, or not use AI at all."
    },
    {
      question: "What is MCP integration?",
      answer: "MCP (Model Context Protocol) lets you connect your own AI tools to Gist. Want to use Claude with your data? Connect your Anthropic API key. Have an on-premise LLM? Connect that instead. You control which AI sees your data — not us."
    },
    {
      question: "Do you store my video recordings?",
      answer: "No. Videos stay in your Google Drive. We only link to them. This keeps your data in infrastructure you already trust and eliminates our hosting costs (savings we pass to you)."
    },
    {
      question: "Can I use AI features today?",
      answer: "Not built-in, but you can export your data anytime and use external AI tools. MCP integration (coming Q1 2026) will make this seamless."
    },
    {
      question: "Is this HIPAA/GDPR compliant?",
      answer: "We provide the tools (audit logs, access controls, data residency in your Google Drive). You own compliance for your specific use case. For Enterprise customers, we can provide a BAA and custom compliance documentation."
    },
    {
      question: "What if I want to switch from Dovetail/Condens?",
      answer: "We're building import tools (coming soon). For now, you can export your data from other tools and bulk-upload to Gist. Email us at hello@usegist.com for migration help."
    },
    {
      question: "Can I export my data anytime?",
      answer: "Yes. Full export in CSV and JSON formats. No lock-in."
    },
    {
      question: "Who is Gist NOT for?",
      answer: "If you want automatic AI summaries and don't care where your data is processed, Dovetail is probably better for you. Gist is for teams who need control over their data."
    }
  ],
  footer: {
    product: [
      { label: "Home", href: "#" },
      { label: "Feature1", href: "#" },
      { label: "Feature2", href: "#" },
      { label: "Feature3", href: "#" }
    ],
    company: [
      { label: "About", href: "#" },
      { label: "Pricing", href: "#" }
    ],
    support: [
      { label: "FAQ", href: "#" },
      { label: "Contact", href: "#" }
    ],
    service: [
      { label: "Terms of service", href: "#" },
      { label: "Privacy policy", href: "#" }
    ],
    copyright: "© 2025 Gist - Shadcnblocks.com"
  }
};

