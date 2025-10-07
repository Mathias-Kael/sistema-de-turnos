import React from 'react';
import { useBusinessState } from '../../context/BusinessContext';
import { ClientBookingExperience } from './ClientBookingExperience';

/**
 * ClientView ahora sólo sirve para el modo "admin preview".
 * El modo público se maneja con PublicClientLoader.
 */
export const ClientView: React.FC = () => {
  const business = useBusinessState();
  return <ClientBookingExperience business={business} mode="admin" />;
};