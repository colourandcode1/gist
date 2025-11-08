import React from 'react';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import { Card, CardContent } from '@/components/ui/card';
import { landingContent } from '@/lib/landingContent';

const TestimonialsCarousel = () => {
  return (
    <div className="container mx-auto px-6 py-16">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-bold mb-4">Trusted by product builders</h2>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Gist is built on the habits that make the best product teams successful: staying focused, moving quickly, and always aiming for high-quality work.
        </p>
        <a href="#" className="text-sm text-primary hover:underline mt-4 inline-block">
          Read our Customer Stories
        </a>
      </div>

      <div className="relative w-full max-w-4xl mx-auto px-12 md:px-0">
        <Carousel className="w-full">
          <CarouselContent>
            {landingContent.testimonials.map((testimonial, index) => (
              <CarouselItem key={index}>
                <Card className="border-none shadow-none">
                  <CardContent className="pt-6 px-6">
                    <blockquote className="text-lg mb-6 leading-relaxed">
                      &ldquo;{testimonial.quote}&rdquo;
                    </blockquote>
                    <div className="flex items-center gap-4">
                      <div>
                        <div className="font-semibold">{testimonial.author}</div>
                        <div className="text-sm text-muted-foreground">
                          {testimonial.role}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {testimonial.company}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="hidden md:flex" />
          <CarouselNext className="hidden md:flex" />
        </Carousel>
      </div>
    </div>
  );
};

export default TestimonialsCarousel;

