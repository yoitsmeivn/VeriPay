import { useAuth0 } from '@auth0/auth0-react';

/**
 * Sign-in / sign-out and a summary of the signed-in user.
 *
 * Auth0 here is exclusively for **registered VeriPay accounts**. Guest link
 * recipients never sign in and never get an account, so nothing in this
 * component should ever become part of a guest flow.
 */
export function AuthControls(): React.JSX.Element {
  const { isLoading, isAuthenticated, user, error, loginWithRedirect, logout } = useAuth0();

  if (isLoading) {
    return <p className="status status--pending">Checking your session…</p>;
  }

  if (error) {
    return (
      <div className="status status--error" role="alert">
        <p>Sign-in failed</p>
        <p className="status__detail">{error.message}</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="auth">
        <p className="app__hint">Sign in to create and manage deals.</p>
        <button type="button" className="button" onClick={() => void loginWithRedirect()}>
          Log in
        </button>
      </div>
    );
  }

  return (
    <div className="auth">
      <dl className="status status--ok">
        <div>
          <dt>Signed in as</dt>
          <dd>{user?.name ?? user?.email ?? 'Unknown user'}</dd>
        </div>
        {user?.email !== undefined && (
          <div>
            <dt>Email</dt>
            <dd>{user.email}</dd>
          </div>
        )}
        <div>
          <dt>Auth0 subject</dt>
          <dd>
            <code>{user?.sub ?? '—'}</code>
          </dd>
        </div>
      </dl>
      <button
        type="button"
        className="button button--secondary"
        onClick={() => void logout({ logoutParams: { returnTo: window.location.origin } })}
      >
        Log out
      </button>
    </div>
  );
}
