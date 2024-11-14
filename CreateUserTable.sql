DROP TABLE IF EXISTS user;    
    
CREATE TABLE IF NOT EXISTS user (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    isAdmin BIT NOT NULL
);

INSERT INTO user (username, name, email, password, isAdmin) VALUES ('admin', 'admin', 'admin@mail.com', 'admin', 1);
INSERT INTO user (username, name, email, password, isAdmin) VALUES ('fer', 'Fer', 'fer@mail.com', 'fer', 0);
INSERT INTO user (username, name, email, password, isAdmin) VALUES ('lucas', 'Lucas', 'lucas@mail.com', 'lucas', 0);
INSERT INTO user (username, name, email, password, isAdmin) VALUES ('valen', 'Valen', 'valen@mail.com', 'valen', 0);
INSERT INTO user (username, name, email, password, isAdmin) VALUES ('carlitos', 'Carlitos', 'carlitos@mail.com', 'carlitos', 0);

