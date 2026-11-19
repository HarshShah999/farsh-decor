import { Page } from '../components/ui/Reveal';
import { LinkButton } from '../components/ui/Button';

export default function NotFoundPage() {
  return (
    <Page className="flex min-h-[80vh] items-center pt-24">
      <div className="container-lux text-center">
        <p className="eyebrow mb-4">404</p>
        <h1 className="text-5xl sm:text-7xl">
          This room is <span className="italic">still being designed</span>
        </h1>
        <p className="mx-auto mt-5 max-w-md text-muted">The page you were looking for doesn't exist or has moved.</p>
        <div className="mt-10 flex justify-center gap-3">
          <LinkButton to="/" icon="arrowRight">
            Back home
          </LinkButton>
          <LinkButton to="/collections" variant="outline">
            Collections
          </LinkButton>
        </div>
      </div>
    </Page>
  );
}
