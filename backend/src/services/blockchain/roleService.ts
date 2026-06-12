import { encodeFunctionData, getAddress } from 'viem';

import { env } from '../../config/env.js';
import { publicClient } from './client.js';
import { getAbis } from './contracts.js';

export const roleService = {
  async getRolesFor(address: string) {
    const account = getAddress(address);
    const { roleManagerAbi } = await getAbis();

    const [adminRole, professorRole, studentRole] = await Promise.all([
      publicClient.readContract({
        address: env.ROLE_MANAGER_ADDRESS,
        abi: roleManagerAbi,
        functionName: 'ADMIN_ROLE',
      }) as Promise<`0x${string}`>,
      publicClient.readContract({
        address: env.ROLE_MANAGER_ADDRESS,
        abi: roleManagerAbi,
        functionName: 'PROFESSOR_ROLE',
      }) as Promise<`0x${string}`>,
      publicClient.readContract({
        address: env.ROLE_MANAGER_ADDRESS,
        abi: roleManagerAbi,
        functionName: 'STUDENT_ROLE',
      }) as Promise<`0x${string}`>,
    ]);

    const [isAdmin, isProfessor, isStudent] = await Promise.all([
      (publicClient.readContract({
        address: env.ROLE_MANAGER_ADDRESS,
        abi: roleManagerAbi,
        functionName: 'hasRole',
        args: [adminRole, account],
      }) as Promise<boolean>),
      (publicClient.readContract({
        address: env.ROLE_MANAGER_ADDRESS,
        abi: roleManagerAbi,
        functionName: 'hasRole',
        args: [professorRole, account],
      }) as Promise<boolean>),
      (publicClient.readContract({
        address: env.ROLE_MANAGER_ADDRESS,
        abi: roleManagerAbi,
        functionName: 'hasRole',
        args: [studentRole, account],
      }) as Promise<boolean>),
    ]);

    return { isAdmin, isProfessor, isStudent };
  },

  async getGroup(address: string) {
    const { roleManagerAbi } = await getAbis();
    return (publicClient.readContract({
      address: env.ROLE_MANAGER_ADDRESS,
      abi: roleManagerAbi,
      functionName: 'getGroup',
      args: [getAddress(address)],
    }) as Promise<string>);
  },

  async buildGrantRoleCalldata(role: 'ADMIN' | 'PROFESSOR' | 'STUDENT', address: string) {
    const { roleManagerAbi } = await getAbis();
    const roleFn =
      role === 'ADMIN' ? 'ADMIN_ROLE' : role === 'PROFESSOR' ? 'PROFESSOR_ROLE' : 'STUDENT_ROLE';

    // We need the concrete role bytes32 to pass into grantRole; read it on-chain.
    const roleId = (await publicClient.readContract({
      address: env.ROLE_MANAGER_ADDRESS,
      abi: roleManagerAbi,
      functionName: roleFn,
    })) as `0x${string}`;

    const data = encodeFunctionData({
      abi: roleManagerAbi,
      functionName: 'grantRole',
      args: [roleId, getAddress(address)],
    });

    return { to: env.ROLE_MANAGER_ADDRESS, data, meta: { roleFn } };
  },

  async buildAssignGroupCalldata(address: string, group: string) {
    const { roleManagerAbi } = await getAbis();
    const data = encodeFunctionData({
      abi: roleManagerAbi,
      functionName: 'assignGroup',
      args: [getAddress(address), group],
    });
    return { to: env.ROLE_MANAGER_ADDRESS, data };
  },
};

