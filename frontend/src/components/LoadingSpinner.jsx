export default function LoadingSpinner({ size = 24 }) {
  return (
    <div className="loading-center">
      <div className="spinner" style={{ width: size, height: size }} />
    </div>
  );
}
