import type { User as UserEntity } from '@logiclab/db' with { 'resolution-mode': 'import' };
import type { AppUser } from '../../application/auth/types';

export async function appUser(user: UserEntity, poolId: string): Promise<AppUser> {
  const { UserIdentityProvider } = await import('@logiclab/db');

  if (
    user.identityProvider !== UserIdentityProvider.Cognito ||
    !user.cognitoSubject ||
    user.cognitoUserPoolId !== poolId
  )
    throw new Error('Expected a Cognito identity in the configured pool.');

  return { id: user.id, subject: user.cognitoSubject, role: user.role };
}
