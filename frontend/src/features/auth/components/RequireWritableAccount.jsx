import { Link, Outlet } from 'react-router-dom';
import { MailWarning } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import EmptyState from '../../../shared/ui/EmptyState';
import Button from '../../../shared/ui/Button';

const RequireWritableAccount = () => {
  const { user } = useAuth();

  if (!user?.isReadOnly) return <Outlet />;

  if (user.isSuspended) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <EmptyState
          title="Account suspended"
          description="You can browse RateOple read-only while suspended. Content creation and normal reports are unavailable."
          action={(
            <Button as={Link} to="/suspension-appeal" variant="primary">
              Submit appeal
            </Button>
          )}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <EmptyState
        title="Confirm your email first"
        description="Your account is read-only until your email is confirmed."
        action={(
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-muted)]">
            <MailWarning className="h-4 w-4" aria-hidden="true" />
            Use the confirmation banner to resend the email.
          </span>
        )}
      />
    </div>
  );
};

export default RequireWritableAccount;
