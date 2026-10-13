import type { AuthConfig } from '../../config/auth';
import type { createAuthService } from '../../application/auth/service';
export type AuthContext = { config: AuthConfig; service: ReturnType<typeof createAuthService> };
