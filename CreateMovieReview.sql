DROP TABLE IF EXISTS movie_review;

CREATE TABLE IF NOT EXISTS movie_review (
    movie_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    review VARCHAR(500),
    rating INTEGER NOT NULL,
    FOREIGN KEY (movie_id) REFERENCES movie(movie_id),
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE
);



