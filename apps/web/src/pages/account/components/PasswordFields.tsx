/** Keeps password constraints, autocomplete, and help text together for login and recovery forms. */
export function PasswordFields({ newPassword }: { newPassword: boolean }) {
  return (
    <>
      <label htmlFor="account-password">{newPassword ? 'New password' : 'Password'}</label>
      <input
        id="account-password"
        name="password"
        type="password"
        required
        minLength={newPassword ? 12 : 1}
        maxLength={128}
        autoComplete={newPassword ? 'new-password' : 'current-password'}
        aria-describedby={newPassword ? 'password-help' : undefined}
      />
      {newPassword && (
        <p id="password-help" className="help">
          Use at least 12 characters, including uppercase, lowercase, a number, and a symbol.
        </p>
      )}
    </>
  );
}
