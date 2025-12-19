import React from 'react';
import { LandingLayout } from './LandingLayout';
import { Hero } from './sections/Hero';
import { Features } from './sections/Features';
import { DemoShowcase } from './sections/DemoShowcase';
import { SocialProof } from './sections/SocialProof';
import { FinalCTA } from './sections/FinalCTA';

export const LandingPage: React.FC = () => {
  return (
    <LandingLayout>
      <Hero />
      <Features />
      <DemoShowcase />
      <SocialProof />
      <FinalCTA />
    </LandingLayout>
  );
};

export default LandingPage;
