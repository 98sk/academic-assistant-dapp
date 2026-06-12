import type { Address } from 'viem';

declare global {
  namespace Express {
    interface Request {
      user?: {
        address: Address;
        chainId: number;
        roles?: {
          isAdmin: boolean;
          isProfessor: boolean;
          isStudent: boolean;
          group?: string;
        };
      };
    }
  }
}

export {};

