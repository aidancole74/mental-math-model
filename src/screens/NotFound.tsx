import { go } from '../router';

export function NotFound() {
  return (
    <main className="screen">
      <div className="screen-body">
        <div className="spacer" />
        <h1 className="title-xl center">That page doesn’t exist</h1>
        <div className="spacer" />
      </div>
      <div className="screen-actions">
        <button className="btn btn-primary" onClick={() => go('/', { replace: true })}>
          Home
        </button>
      </div>
    </main>
  );
}
