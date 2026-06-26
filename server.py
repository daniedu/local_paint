import http.server
import json
import os
import urllib.parse
import base64
import sqlite3
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "data.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    return conn

def init_db():
    conn = get_db()
    conn.executescript("""
        CREATE TABLE IF NOT EXISTS drawings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            author TEXT NOT NULL,
            image TEXT NOT NULL,
            timestamp TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS ratings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            drawing_id INTEGER NOT NULL,
            rater TEXT NOT NULL,
            value INTEGER NOT NULL,
            timestamp TEXT NOT NULL,
            FOREIGN KEY (drawing_id) REFERENCES drawings(id)
        );
        CREATE TABLE IF NOT EXISTS chat_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            author TEXT NOT NULL,
            text TEXT NOT NULL,
            timestamp TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            drawing_id INTEGER NOT NULL,
            author TEXT NOT NULL,
            text TEXT NOT NULL,
            timestamp TEXT NOT NULL,
            FOREIGN KEY (drawing_id) REFERENCES drawings(id)
        );
        CREATE INDEX IF NOT EXISTS idx_ratings_drawing ON ratings(drawing_id);
        CREATE INDEX IF NOT EXISTS idx_comments_drawing ON comments(drawing_id);
    """)
    conn.commit()
    conn.close()

init_db()

class DrawingHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=os.path.dirname(__file__), **kwargs)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_cors_headers()
        self.end_headers()

    def send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        qs = urllib.parse.parse_qs(parsed.query)
        if parsed.path == "/api/drawings":
            self.handle_get_drawings()
        elif parsed.path == "/api/chat":
            self.handle_get_chat()
        elif parsed.path == "/api/comments":
            self.handle_get_comments(qs)
        elif parsed.path.startswith("/api/drawings/"):
            parts = parsed.path.split("/")
            if len(parts) == 5 and parts[4] == "image":
                self.handle_get_image(parts[3])
            else:
                self.send_error(404)
        else:
            super().do_GET()

    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_length) if content_length > 0 else b"{}"
        data = json.loads(body)

        if self.path == "/api/drawings":
            self.handle_create_drawing(data)
        elif self.path == "/api/ratings":
            self.handle_create_rating(data)
        elif self.path == "/api/chat":
            self.handle_send_chat(data)
        elif self.path == "/api/comments":
            self.handle_add_comment(data)
        elif self.path == "/api/clear":
            self.handle_clear()
        else:
            self.send_error(404)

    def handle_get_drawings(self):
        conn = get_db()
        rows = conn.execute("SELECT id, author, timestamp FROM drawings ORDER BY id DESC").fetchall()
        conn.close()
        result = []
        for r in rows:
            d_id = r["id"]
            conn2 = get_db()
            stats = conn2.execute(
                "SELECT COUNT(*) AS cnt, COALESCE(AVG(value), 0) AS avg FROM ratings WHERE drawing_id = ?",
                (d_id,)
            ).fetchone()
            conn2.close()
            result.append({
                "id": d_id,
                "author": r["author"],
                "timestamp": r["timestamp"],
                "average_rating": round(stats["avg"], 1),
                "ratings_count": stats["cnt"],
                "has_image": True
            })
        self.send_json(result)

    def handle_get_image(self, drawing_id):
        conn = get_db()
        row = conn.execute("SELECT image FROM drawings WHERE id = ?", (drawing_id,)).fetchone()
        conn.close()
        if not row:
            self.send_error(404, "Drawing not found")
            return
        img_data = base64.b64decode(row["image"])
        self.send_response(200)
        self.send_header("Content-Type", "image/png")
        self.send_header("Content-Length", str(len(img_data)))
        self.send_cors_headers()
        self.end_headers()
        self.wfile.write(img_data)

    def handle_create_drawing(self, data):
        author = data.get("author", "").strip()
        image_b64 = data.get("image", "")
        if not author or not image_b64:
            self.send_json({"error": "Author and image are required"}, 400)
            return
        now = datetime.now().isoformat()
        conn = get_db()
        cur = conn.execute(
            "INSERT INTO drawings (author, image, timestamp) VALUES (?, ?, ?)",
            (author, image_b64, now)
        )
        drawing_id = cur.lastrowid
        conn.commit()
        conn.close()
        self.send_json({"id": drawing_id, "success": True})

    def handle_create_rating(self, data):
        drawing_id = data.get("drawing_id")
        value = data.get("value")
        rater = data.get("rater", "").strip()
        if not drawing_id or not value or not rater:
            self.send_json({"error": "drawing_id, value, and rater are required"}, 400)
            return
        conn = get_db()
        exists = conn.execute("SELECT 1 FROM drawings WHERE id = ?", (drawing_id,)).fetchone()
        if not exists:
            conn.close()
            self.send_json({"error": "Drawing not found"}, 404)
            return
        conn.execute("DELETE FROM ratings WHERE drawing_id = ? AND rater = ?", (drawing_id, rater))
        conn.execute(
            "INSERT INTO ratings (drawing_id, rater, value, timestamp) VALUES (?, ?, ?, ?)",
            (drawing_id, rater, int(value), datetime.now().isoformat())
        )
        conn.commit()
        conn.close()
        self.send_json({"success": True})

    def handle_get_chat(self):
        conn = get_db()
        rows = conn.execute(
            "SELECT id, author, text, timestamp FROM chat_messages ORDER BY id DESC LIMIT 100"
        ).fetchall()
        conn.close()
        result = [dict(r) for r in reversed(rows)]
        self.send_json(result)

    def handle_send_chat(self, data):
        author = data.get("author", "").strip()
        text = data.get("text", "").strip()
        if not author or not text:
            self.send_json({"error": "author and text required"}, 400)
            return
        now = datetime.now().isoformat()
        conn = get_db()
        cur = conn.execute(
            "INSERT INTO chat_messages (author, text, timestamp) VALUES (?, ?, ?)",
            (author, text, now)
        )
        msg_id = cur.lastrowid
        # Keep last 100
        conn.execute(
            "DELETE FROM chat_messages WHERE id NOT IN (SELECT id FROM chat_messages ORDER BY id DESC LIMIT 100)"
        )
        conn.commit()
        conn.close()
        self.send_json({"success": True, "id": msg_id})

    def handle_get_comments(self, qs):
        drawing_id = qs.get("drawing_id", [None])[0]
        if not drawing_id:
            self.send_json({"error": "drawing_id required"}, 400)
            return
        conn = get_db()
        rows = conn.execute(
            "SELECT id, drawing_id, author, text, timestamp FROM comments WHERE drawing_id = ? ORDER BY id DESC",
            (drawing_id,)
        ).fetchall()
        conn.close()
        self.send_json([dict(r) for r in reversed(rows)])

    def handle_add_comment(self, data):
        drawing_id = data.get("drawing_id")
        author = data.get("author", "").strip()
        text = data.get("text", "").strip()
        if not drawing_id or not author or not text:
            self.send_json({"error": "drawing_id, author, and text required"}, 400)
            return
        conn = get_db()
        exists = conn.execute("SELECT 1 FROM drawings WHERE id = ?", (drawing_id,)).fetchone()
        if not exists:
            conn.close()
            self.send_json({"error": "Drawing not found"}, 404)
            return
        cur = conn.execute(
            "INSERT INTO comments (drawing_id, author, text, timestamp) VALUES (?, ?, ?, ?)",
            (drawing_id, author, text, datetime.now().isoformat())
        )
        comment_id = cur.lastrowid
        conn.commit()
        conn.close()
        self.send_json({"success": True, "id": comment_id})

    def handle_clear(self):
        conn = get_db()
        conn.executescript("""
            DELETE FROM ratings;
            DELETE FROM comments;
            DELETE FROM chat_messages;
            DELETE FROM drawings;
        """)
        conn.commit()
        conn.close()
        self.send_json({"success": True})

    def send_json(self, obj, status=200):
        resp = json.dumps(obj).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_cors_headers()
        self.send_header("Content-Length", str(len(resp)))
        self.end_headers()
        self.wfile.write(resp)

    def log_message(self, format, *args):
        print(f"[{datetime.now().strftime('%H:%M:%S')}] {args[0]} {args[1]} {args[2]}")

if __name__ == "__main__":
    port = 8000
    http.server.HTTPServer.allow_reuse_address = True
    server = http.server.HTTPServer(("0.0.0.0", port), DrawingHandler)
    print(f"Serving drawing app at http://0.0.0.0:{port}")
    print(f"Access from other devices on your network using your IP address")
    server.serve_forever()
