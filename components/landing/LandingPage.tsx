import React from 'react';
import { LandingLayout } from './LandingLayout';
import { Hero } from './sections/Hero';
import { Features } from './sections/Features';
import { DemoShowcase } from './sections/DemoShowcase';
import { SocialProof } from './sections/SocialProof';
import { FinalCTA } from './sections/FinalCTA';

console.log('[LandingPage] Component module loaded');

export const LandingPage: React.FC = () => {
  console.log('[LandingPage] Component rendering');
  
  React.useEffect(() => {
    console.log('[LandingPage] Component mounted successfully');
    return () => {
      console.log('[LandingPage] Component unmounting');
    };
  }, []);
  
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
