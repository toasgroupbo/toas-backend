import { AsyncLocalStorage } from 'async_hooks';

export const LoggerContext = new AsyncLocalStorage<string>();
