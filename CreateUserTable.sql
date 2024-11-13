DROP TABLE IF EXISTS user;    
    
CREATE TABLE IF NOT EXISTS user (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    isAdmin BIT NOT NULL
);

INSERT INTO user (username, name, email, password, isAdmin) VALUES ('admin', 'admin', 'admin@admin.com', 'admin', 1);
INSERT INTO user (username, name, email, password, isAdmin) VALUES ('fer', 'fer', 'fer@fer.com', 'fer', 0);
INSERT INTO user (username, name, email, password, isAdmin) VALUES ('lucas', 'lucas', 'lucas@lucas.com', 'lucas', 0);
INSERT INTO user (username, name, email, password, isAdmin) VALUES ('valen', 'valen', 'valen@valen.com', 'valen', 0);
INSERT INTO user (username, name, email, password, isAdmin) VALUES ('carlitos', 'carlitos', 'carlitos@carlitos.com', 'carlitos', 0);