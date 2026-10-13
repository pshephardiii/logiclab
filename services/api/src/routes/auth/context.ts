import type { AuthConfig } from '../../auth/config';
import type { createAuthService } from '../../auth/service';
export type AuthContext = { config: AuthConfig; service: ReturnType<typeof createAuthService> };
