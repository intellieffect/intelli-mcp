/**
 * Simple environment detection
 */

import { app } from 'electron';

export const isDev = process.env.NODE_ENV === 'development' || 
  process.defaultApp || 
  !app.isPackaged;

export const isProduction = !isDev;