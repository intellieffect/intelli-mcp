/**
 * Mock Service Worker server for API mocking in tests
 */

import { setupServer } from 'msw/node';
import { handlers } from './handlers';

// Setup the mock server with the handlers
export const server = setupServer(...handlers);

// Export handlers for reuse
export { handlers };