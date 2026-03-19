#!/usr/bin/env python3
"""
Simple local server for testing the StudyFlowSuite website
Run: python serve.py
Then open: http://localhost:8000
"""
import http.server
import socketserver
import os

PORT = 8000

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Add CORS headers for local testing
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

os.chdir(os.path.dirname(os.path.abspath(__file__)))

with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
    print(f"✅ Server running at http://localhost:{PORT}/")
    print(f"📂 Serving files from: {os.getcwd()}")
    print(f"\n🌐 Open in browser:")
    print(f"   - Landing page: http://localhost:{PORT}/")
    print(f"   - Signup: http://localhost:{PORT}/signup.html")
    print(f"   - Login: http://localhost:{PORT}/login.html")
    print(f"   - Demo: http://localhost:{PORT}/demo.html")
    print(f"\n🛑 Press Ctrl+C to stop\n")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n\n✅ Server stopped")
