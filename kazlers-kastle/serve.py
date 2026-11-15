"""Serve the game locally with caching turned off, so a refresh always loads the latest files.

Run from this folder:  python3 serve.py   (then open http://localhost:8000)
"""
import http.server
import socketserver


class NoCache(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        self.send_header("Expires", "0")
        super().end_headers()


PORT = 8000
socketserver.TCPServer.allow_reuse_address = True
with socketserver.TCPServer(("", PORT), NoCache) as httpd:
    print(f"Kazler's Kastle at http://localhost:{PORT}  (Ctrl+C to stop)")
    httpd.serve_forever()
