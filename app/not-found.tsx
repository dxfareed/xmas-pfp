import { headers } from 'next/headers';

export default function NotFound() {
  headers(); // Opt-out of caching for this page
  return (
    <>
        <h1>404 - Page Not Found</h1>
        <p>The page you are looking for does not exist.</p>
    </>
  );
}
