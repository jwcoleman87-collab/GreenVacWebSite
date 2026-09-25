"""Local static preview with the same extensionless page URLs as production."""
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parent.parent

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_GET(self):
        url = urlsplit(self.path)
        candidate = Path(self.translate_path(url.path))
        if url.path != '/' and candidate.suffix == '' and candidate.with_suffix('.html').is_file():
            self.path = url.path.rstrip('/') + '.html' + ('?' + url.query if url.query else '')
            if url.path.endswith('/'):
                self.send_response(302)
                self.send_header('Location', self.path)
                self.end_headers()
                return
        super().do_GET()

if __name__ == '__main__':
    print('GreenVac preview: http://localhost:8123', flush=True)
    ThreadingHTTPServer(('127.0.0.1', 8123), Handler).serve_forever()
