/** Suppress account-discovery details in resend and recovery responses. */
export const hiddenAccountErrors = new Set([
  'UserNotFoundException',
  'NotAuthorizedException',
  'InvalidParameterException',
  'UsernameExistsException',
]);
