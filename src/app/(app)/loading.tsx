export default function Loading() {
  return (
    <div className="grid animate-pulse gap-4" aria-hidden>
      <div className="h-8 w-48 rounded-md bg-muted" />
      <div className="grid grid-cols-4 gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-md bg-muted" />
        ))}
      </div>
      <div className="h-96 rounded-md bg-muted" />
    </div>
  );
}
