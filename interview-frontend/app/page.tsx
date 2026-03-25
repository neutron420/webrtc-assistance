"use client";
import React from "react";
import { HeroSection } from "@/components/hero-section-1";
import { Features } from "@/components/features-8";
import { StaggerTestimonials } from "@/components/stagger-testimonials";
import FooterSection from "@/components/footer";

const Index = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <HeroSection />
      <Features />
      
      <section className="py-24 bg-background">
        <div className="max-w-7xl mx-auto px-6 mb-16 text-center">
          <h2 className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl mb-4">Success Stories</h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            See how our platform has helped candidates from India crack the world's most prestigious tech companies.
          </p>
        </div>
        <StaggerTestimonials />
      </section>

      <FooterSection />
    </div>
  );
};

export default Index;
