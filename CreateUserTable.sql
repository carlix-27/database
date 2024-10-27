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

DROP TABLE IF EXISTS movie_review;

CREATE TABLE IF NOT EXISTS movie_review (
    movie_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    review VARCHAR(500),
    rating INTEGER NOT NULL,
    FOREIGN KEY (movie_id) REFERENCES movie(movie_id),
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);

DROP TABLE IF EXISTS movie_review;

CREATE TABLE IF NOT EXISTS movie_review (
    movie_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    review VARCHAR(500),
    rating INTEGER NOT NULL,
    FOREIGN KEY (movie_id) REFERENCES movie(movie_id),
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);