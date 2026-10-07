export function Footer({ withMobileNavigation = false }: { withMobileNavigation?: boolean }) {
  return (
    <footer className={`mt-8 border-t bg-gray-50 px-4 py-4 ${
      withMobileNavigation ? "pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-4" : ""
    }`}>
      <div className="mx-auto max-w-screen-2xl text-center text-xs text-gray-500">
        <p>
          Meer informatie:{" "}
          <a 
            href="https://groningenwerktcirculair.info" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-gwc-primary hover:underline"
          >
            groningenwerktcirculair.info
          </a>
        </p>
      </div>
    </footer>
  );
}