DROP TABLE IF EXISTS user;    
    
CREATE TABLE IF NOT EXISTS user (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
);

INSERT INTO user (username, name, email, password) VALUES ('admin', 'admin', 'admin@admin.com', 'admin');