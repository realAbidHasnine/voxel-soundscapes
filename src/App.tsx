export default function App() {
  return (
    <main className="flex min-h-svh items-center justify-center px-6 py-12">
      <section
        aria-labelledby="welcome-title"
        className="w-full max-w-2xl rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl sm:p-14"
      >
        <p className="text-xs font-medium uppercase tracking-[0.25em] text-emerald-200">
          Recursive Soundscapes
        </p>
        <h1
          id="welcome-title"
          className="mt-6 text-4xl font-light leading-tight tracking-tight text-stone-100 sm:text-6xl"
        >
          A little room
          <br />
          to slow down.
        </h1>
        <p className="mt-6 max-w-md text-base leading-relaxed text-stone-300">
          Branch by branch, a tree will grow into a soundscape.
          Shape its growth and discover a melody of your own.
        </p>
        <p className="mt-10 border-t border-white/10 pt-6 text-sm text-stone-400">
          Taking root. The interactive experience is coming soon.
        </p>
      </section>
    </main>
  )
}
