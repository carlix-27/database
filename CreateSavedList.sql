DROP TABLE IF EXISTS saved_list;

CREATE TABLE IF NOT EXISTS saved_list (
    movie_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    fav BOOLEAN NOT NULL CHECK (fav IN (0, 1)),
    FOREIGN KEY (movie_id) REFERENCES movie(movie_id),
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);