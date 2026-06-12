export type AuthRoles = {
  isAdmin: boolean;
  isProfessor: boolean;
  isStudent: boolean;
};

export type AuthSession = {
  token: string;
  address: `0x${string}`;
  chainId: number;
  roles: AuthRoles;
  group?: string;
  expiresAtMs: number;
};

