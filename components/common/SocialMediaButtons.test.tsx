// components/common/SocialMediaButtons.test.tsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { SocialMediaButtons } from './SocialMediaButtons';
import { Business } from '../../types';
import { DEFAULT_HOURS_TEMPLATE } from '../../constants';

const createMockBusiness = (overrides?: Partial<Business>): Business => ({
  id: 'biz_1',
  name: 'Mi Negocio',
  description: 'Descripción del negocio',
  phone: '+5491112345678',
  branding: {
    primaryColor: '#1a202c',
    secondaryColor: '#edf2f7',
    textColor: '#2d3748',
    font: "'Poppins', sans-serif",
  },
  employees: [],
  services: [],
  hours: DEFAULT_HOURS_TEMPLATE,
  bookings: [],
  ...overrides,
});

describe('SocialMediaButtons', () => {
  it('should render WhatsApp button when whatsapp is configured', () => {
    const business = createMockBusiness({
      whatsapp: '+5491112345678',
    });

    render(<SocialMediaButtons business={business} />);

    const whatsappButton = screen.getByLabelText(/Contactar a Mi Negocio por WhatsApp/i);
    expect(whatsappButton).toBeInTheDocument();
    expect(whatsappButton).toHaveAttribute('href', 'https://wa.me/5491112345678?text=Hola%20Mi%20Negocio%2C%20quisiera%20consultarte%20sobre%20tus%20servicios.');
  });

  it('should render Instagram button when instagram is configured', () => {
    const business = createMockBusiness({
      instagram: 'mi_negocio',
    });

    render(<SocialMediaButtons business={business} />);

    const instagramButton = screen.getByLabelText(/Ver el perfil de Mi Negocio en Instagram/i);
    expect(instagramButton).toBeInTheDocument();
    expect(instagramButton).toHaveAttribute('href', 'https://instagram.com/mi_negocio');
  });

  it('should render Facebook button when facebook is configured', () => {
    const business = createMockBusiness({
      facebook: 'mi.negocio',
    });

    render(<SocialMediaButtons business={business} />);

    const facebookButton = screen.getByLabelText(/Ver la página de Mi Negocio en Facebook/i);
    expect(facebookButton).toBeInTheDocument();
    expect(facebookButton).toHaveAttribute('href', 'https://facebook.com/mi.negocio');
  });

  it('should render all social media buttons when all are configured', () => {
    const business = createMockBusiness({
      whatsapp: '+5491112345678',
      instagram: 'mi_negocio',
      facebook: 'mi.negocio',
    });

    render(<SocialMediaButtons business={business} />);

    expect(screen.getByLabelText(/Contactar a Mi Negocio por WhatsApp/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Ver el perfil de Mi Negocio en Instagram/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Ver la página de Mi Negocio en Facebook/i)).toBeInTheDocument();
  });

  it('should render nothing when no social media is configured', () => {
    const business = createMockBusiness({
      whatsapp: undefined,
      instagram: undefined,
      facebook: undefined,
    });

    const { container } = render(<SocialMediaButtons business={business} />);

    expect(container.firstChild).toBeNull();
  });

  it('should use custom message for WhatsApp', () => {
    const business = createMockBusiness({
      whatsapp: '+5491112345678',
    });

    render(<SocialMediaButtons business={business} message="Hola, quiero reservar" />);

    const whatsappButton = screen.getByLabelText(/Contactar a Mi Negocio por WhatsApp/i);
    expect(whatsappButton).toHaveAttribute('href', 'https://wa.me/5491112345678?text=Hola%2C%20quiero%20reservar');
  });

  it('should apply custom className', () => {
    const business = createMockBusiness({
      whatsapp: '+5491112345678',
    });

    const { container } = render(<SocialMediaButtons business={business} className="my-custom-class" />);

    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper).toHaveClass('my-custom-class');
  });

  it('should open links in new tab with noopener noreferrer', () => {
    const business = createMockBusiness({
      whatsapp: '+5491112345678',
      instagram: 'mi_negocio',
    });

    render(<SocialMediaButtons business={business} />);

    const whatsappLink = screen.getByLabelText(/Contactar a Mi Negocio por WhatsApp/i);
    const instagramLink = screen.getByLabelText(/Ver el perfil de Mi Negocio en Instagram/i);

    expect(whatsappLink).toHaveAttribute('target', '_blank');
    expect(whatsappLink).toHaveAttribute('rel', 'noopener noreferrer');
    expect(instagramLink).toHaveAttribute('target', '_blank');
    expect(instagramLink).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
