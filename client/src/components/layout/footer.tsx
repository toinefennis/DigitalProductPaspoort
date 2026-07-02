export function Footer() {
  return (
    <footer className="mt-8 p-4 border-t bg-gray-50">
      <div className="text-center text-xs text-gray-500">
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