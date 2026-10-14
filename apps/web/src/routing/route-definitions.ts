import type { AuthUserResponse } from '@logiclab/contracts';

export type AccountUser = AuthUserResponse['user'];

export type AccountRole = AccountUser['role'];

export interface RouteAccess {
  allowedRoles: readonly AccountRole[];
  deniedTitle: string;
  deniedMessage: string;
}

interface RouteDefinition {
  path: string;
  navigation: {
    label: string;
    signedInLabel?: (user: AccountUser) => string;
    end?: boolean;
  };
  access?: RouteAccess;
}

export const routeDefinitions = {
  practice: {
    path: '/',
    navigation: { label: 'Practice', end: true },
  },
  account: {
    path: '/account',
    navigation: {
      label: 'Sign in / Create account',
      signedInLabel: (user: AccountUser) => `Account · ${user.role}`,
    },
  },
  instructorClasses: {
    path: '/classes',
    navigation: { label: 'Classes' },
    access: {
      allowedRoles: ['instructor'],
      deniedTitle: 'Instructor access required',
      deniedMessage: 'Classes are currently managed through instructor accounts.',
    },
  },
  studentClasses: {
    path: '/enrollments',
    navigation: { label: 'My classes' },
    access: {
      allowedRoles: ['student'],
      deniedTitle: 'Student access required',
      deniedMessage: 'Joining classes requires a student account.',
    },
  },
} satisfies Record<string, RouteDefinition>;

// Keep navigation in the same order as the route definitions.
export const navigationRoutes: readonly RouteDefinition[] = Object.values(routeDefinitions);
