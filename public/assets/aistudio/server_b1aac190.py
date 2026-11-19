from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse
from pathlib import Path
import json, sqlite3, uuid

ROOT = Path(__file__).parent
DB = ROOT / "valebike.sqlite3"

def connect():
    db = sqlite3.connect(DB)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA foreign_keys=ON")
    return db

def init():
    with connect() as d:
        d.executescript('''
        CREATE TABLE IF NOT EXISTS customers(id TEXT PRIMARY KEY,name TEXT NOT NULL,phone TEXT,email TEXT,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS bikes(id TEXT PRIMARY KEY,customer_id TEXT REFERENCES customers(id),brand TEXT,model TEXT,category TEXT,color TEXT,serial TEXT,notes TEXT);
        CREATE TABLE IF NOT EXISTS requests(id TEXT PRIMARY KEY,customer_id TEXT REFERENCES customers(id),bike_id TEXT REFERENCES bikes(id),kind TEXT,message TEXT,status TEXT DEFAULT 'Novo',created_at TEXT DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS orders(id TEXT PRIMARY KEY,number INTEGER UNIQUE,customer_id TEXT REFERENCES customers(id),bike_id TEXT REFERENCES bikes(id),problem TEXT,mechanic TEXT,status TEXT DEFAULT 'Recebida',total REAL DEFAULT 0,created_at TEXT DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS products(id TEXT PRIMARY KEY,name TEXT,sku TEXT,category TEXT,quantity INTEGER DEFAULT 0,min_quantity INTEGER DEFAULT 0,price REAL DEFAULT 0);
        ''')
        if d.execute('SELECT COUNT(*) FROM products').fetchone()[0] == 0:
            d.executemany('INSERT INTO products VALUES(?,?,?,?,?,?,?)',[(str(uuid.uuid4()),'Câmara aro 29','CAM-29','Câmaras',8,4,32.9),(str(uuid.uuid4()),'Pastilha de freio Shimano','FRE-SH','Freios',3,5,49.9),(str(uuid.uuid4()),'Corrente 9 velocidades','COR-09','Transmissão',12,4,89.9)])

class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*a,**kw): super().__init__(*a,directory=str(ROOT),**kw)
    def log_message(self,*a): pass
    def send_json(self,obj,status=200):
        b=json.dumps(obj,ensure_ascii=False).encode(); self.send_response(status); self.send_header('Content-Type','application/json; charset=utf-8'); self.send_header('Content-Length',str(len(b))); self.send_header('Access-Control-Allow-Origin','*'); self.end_headers(); self.wfile.write(b)
    def do_OPTIONS(self): self.send_response(204); self.send_header('Access-Control-Allow-Origin','*'); self.send_header('Access-Control-Allow-Headers','Content-Type'); self.send_header('Access-Control-Allow-Methods','GET,POST,PATCH,OPTIONS'); self.end_headers()
    def body(self):
        n=int(self.headers.get('Content-Length',0)); return json.loads(self.rfile.read(n) or b'{}')
    def do_GET(self):
        path=urlparse(self.path).path
        if path.startswith('/api/'):
            with connect() as d:
                if path=='/api/summary':
                    self.send_json({'requests':d.execute("SELECT COUNT(*) FROM requests WHERE status='Novo'").fetchone()[0],'orders':d.execute("SELECT COUNT(*) FROM orders WHERE status NOT IN ('Entregue','Cancelada')").fetchone()[0],'customers':d.execute('SELECT COUNT(*) FROM customers').fetchone()[0],'low_stock':d.execute('SELECT COUNT(*) FROM products WHERE quantity<=min_quantity').fetchone()[0]}); return
                table={'/api/requests':'requests','/api/orders':'orders','/api/customers':'customers','/api/bikes':'bikes','/api/products':'products'}.get(path)
                if table:
                    rows=d.execute(f'SELECT * FROM {table} ORDER BY rowid DESC').fetchall(); self.send_json([dict(r) for r in rows]); return
            self.send_json({'error':'Não encontrado'},404); return
        if path=='/gestao': self.path='/admin.html'
        elif path=='/': self.path='/index.html'
        return super().do_GET()
    def do_POST(self):
        path=urlparse(self.path).path; x=self.body()
        try:
            with connect() as d:
                if path=='/api/requests':
                    if not x.get('name') or not x.get('phone'): self.send_json({'error':'Nome e telefone são obrigatórios'},400); return
                    c=str(uuid.uuid4()); b=str(uuid.uuid4()); r=str(uuid.uuid4())
                    d.execute('INSERT INTO customers(id,name,phone,email) VALUES(?,?,?,?)',(c,x['name'],x['phone'],x.get('email','')))
                    d.execute('INSERT INTO bikes(id,customer_id,brand,model,category) VALUES(?,?,?,?,?)',(b,c,x.get('brand',''),x.get('model',''),x.get('category','')))
                    d.execute('INSERT INTO requests(id,customer_id,bike_id,kind,message) VALUES(?,?,?,?,?)',(r,c,b,x.get('kind','Orçamento'),x.get('message','')))
                    self.send_json({'ok':True,'id':r},201); return
                if path=='/api/orders':
                    number=d.execute('SELECT COALESCE(MAX(number),1000)+1 FROM orders').fetchone()[0]
                    ident=str(uuid.uuid4()); d.execute('INSERT INTO orders(id,number,customer_id,bike_id,problem,mechanic,status,total) VALUES(?,?,?,?,?,?,?,?)',(ident,number,x.get('customer_id'),x.get('bike_id'),x.get('problem',''),x.get('mechanic',''),x.get('status','Recebida'),x.get('total',0))); self.send_json({'ok':True,'id':ident,'number':number},201); return
                if path=='/api/products':
                    ident=str(uuid.uuid4()); d.execute('INSERT INTO products VALUES(?,?,?,?,?,?,?)',(ident,x.get('name',''),x.get('sku',''),x.get('category','Geral'),int(x.get('quantity',0)),int(x.get('min_quantity',0)),float(x.get('price',0)))); self.send_json({'ok':True,'id':ident},201); return
        except Exception as e: self.send_json({'error':str(e)},400); return
        self.send_json({'error':'Não encontrado'},404)
    def do_PATCH(self):
        path=urlparse(self.path).path; x=self.body(); parts=path.strip('/').split('/')
        if len(parts)==3 and parts[0]=='api' and parts[1] in ('requests','orders'):
            table=parts[1]
            with connect() as d: d.execute(f'UPDATE {table} SET status=? WHERE id=?',(x.get('status',''),parts[2]))
            self.send_json({'ok':True}); return
        self.send_json({'error':'Não encontrado'},404)

if __name__=='__main__':
    init(); print('Vale Bike em http://localhost:8000'); ThreadingHTTPServer(('127.0.0.1',8000),Handler).serve_forever()
