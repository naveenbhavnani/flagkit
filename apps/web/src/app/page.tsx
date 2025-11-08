export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-6xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          FlagKit
        </h1>
        <p className="text-xl text-muted-foreground mb-8">
          Feature Flag Management Platform with Built-in Experimentation
        </p>
        <div className="flex gap-4 justify-center">
          <button className="px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">
            Get Started
          </button>
          <button className="px-6 py-3 border border-border rounded-lg hover:bg-accent transition-colors">
            View Documentation
          </button>
        </div>
      </div>
    </main>
  );
}
