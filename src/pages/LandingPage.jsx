import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Workflow, Flag, Users, BarChart3, Lock, Play, FileSearch, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import LandingNavigation from '@/components/LandingNavigation';
import TestimonialsCarousel from '@/components/TestimonialsCarousel';
import { landingContent } from '@/lib/landingContent';

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <LandingNavigation />

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-16 md:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center max-w-7xl mx-auto">
          {/* Left Column - Text Content */}
          <div className="space-y-8">
            <div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6 leading-tight">
                {landingContent.hero.headline}
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-8">
                {landingContent.hero.subheadline}
              </p>
            </div>
            
            {/* Features Grid */}
            <div id="product" className="grid grid-cols-2 gap-6 mb-8">
              {landingContent.features.map((feature, index) => {
                const icons = [Workflow, Flag, Users, BarChart3];
                const IconComponent = icons[index];
                return (
                  <div key={index} className="flex items-start gap-3">
                    <IconComponent className="h-5 w-5 text-foreground mt-0.5 flex-shrink-0" />
                    <div>
                      <h3 className="font-semibold mb-1">{feature.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {feature.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/signup">
                <Button size="lg" className="w-full sm:w-auto">
                  {landingContent.hero.ctaPrimary}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Button variant="outline" size="lg" className="w-full sm:w-auto">
                {landingContent.hero.ctaSecondary}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Right Column - Placeholder Image */}
          <div className="hidden lg:block">
            <div className="w-full h-[600px] bg-muted rounded-lg border-2 border-dashed border-muted-foreground/20 flex items-center justify-center">
              <div className="text-center space-y-4 p-8">
                <div className="w-16 h-16 mx-auto bg-muted-foreground/10 rounded-lg flex items-center justify-center">
                  <svg
                    className="w-8 h-8 text-muted-foreground"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
                <p className="text-sm text-muted-foreground">
                  Product Image Placeholder
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="container mx-auto px-6 py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">
              {landingContent.featuresSection.title}
            </h2>
            {landingContent.featuresSection.subtitle && (
              <p className="text-muted-foreground max-w-2xl mx-auto">
                {landingContent.featuresSection.subtitle}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            {landingContent.featuresSection.features.map((feature, index) => {
              const iconMap = {
                Lock,
                BarChart3,
                Play,
                Users,
                FileSearch,
                Download
              };
              const IconComponent = iconMap[feature.icon] || Lock;
              
              return (
                <div key={index} className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                    <IconComponent className="h-6 w-6 text-foreground" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="bg-muted/50 py-16">
        <TestimonialsCarousel />
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="container mx-auto px-6 py-16">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">{landingContent.pricing.header}</h2>
            {landingContent.pricing.note && (
              <div className="mt-4">
                <span className="text-sm text-muted-foreground">{landingContent.pricing.note}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {landingContent.pricing.tiers.map((tier, index) => (
              <Card key={index} className={index === 1 ? 'border-primary shadow-lg' : ''}>
                <CardHeader>
                  <CardTitle>{tier.name}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{tier.price}</span>
                    {tier.period && (
                      <span className="text-muted-foreground ml-2">{tier.period}</span>
                    )}
                  </div>
                  {tier.userRange && (
                    <CardDescription className="mt-2">{tier.userRange}</CardDescription>
                  )}
                  {tier.description && (
                    <CardDescription className="mt-2">{tier.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {tier.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Link to="/signup" className="w-full">
                    <Button
                      className="w-full"
                      variant={index === 1 ? 'default' : 'outline'}
                    >
                      {tier.cta}
                    </Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="container mx-auto px-6 py-16">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Frequently Asked Questions</h2>
          </div>

          <Accordion type="single" collapsible className="w-full">
            {landingContent.faq.map((item, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-6 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">
            Ready to Take Control of Your Research Data?
          </h2>
          <Link to="/signup">
            <Button size="lg" className="mt-6">
              Start Free Trial
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-muted/50">
        <div className="container mx-auto px-6 py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-sm">
                {landingContent.footer.product.map((link, index) => (
                  <li key={index}>
                    <a href={link.href} className="text-muted-foreground hover:text-foreground">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-sm">
                {landingContent.footer.company.map((link, index) => (
                  <li key={index}>
                    <a href={link.href} className="text-muted-foreground hover:text-foreground">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-sm">
                {landingContent.footer.support.map((link, index) => (
                  <li key={index}>
                    <a href={link.href} className="text-muted-foreground hover:text-foreground">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Service</h3>
              <ul className="space-y-2 text-sm">
                {landingContent.footer.service.map((link, index) => (
                  <li key={index}>
                    <a href={link.href} className="text-muted-foreground hover:text-foreground">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="border-t pt-8 text-center text-sm text-muted-foreground">
            {landingContent.footer.copyright}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;

