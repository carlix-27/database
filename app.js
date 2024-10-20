const express = require('express');
const sqlite3 = require('sqlite3');
const ejs = require('ejs');

const app = express();
const port = process.env.PORT || 3000;

// Serve static files from the "views" directory
app.use(express.static('views'));

// Path completo de la base de datos movies.db
// Por ejemplo 'C:\\Users\\datagrip\\movies.db'
const db = new sqlite3.Database('./movies.db');

// Configurar el motor de plantillas EJS
app.set('view engine', 'ejs');

// Ruta para la página de inicio
app.get('/', (req, res) => {
    res.render('index');
});

// Ruta para buscar películas
app.get('/buscar', (req, res) => {
    const searchTerm = req.query.q;

    // Realizar la búsqueda en la base de datos
    db.all(
        'SELECT * FROM movie WHERE title LIKE ?',
        [`%${searchTerm}%`],
        (err, rows) => {
            if (err) {
                console.error(err);
                res.status(500).send('Error en la búsqueda.');
            } else {
                res.render('resultado', { movies: rows });
            }
        }
    );
});

// Ruta para la página de datos de una película particular
app.get('/pelicula/:id', async (req, res) => {
    const movieId = req.params.id;

    // Consulta SQL para obtener los datos de elenco y crew
    const crew_cast_query = `
        SELECT
            actor.person_name as actor_name,
            actor.person_id as actor_id,
            crew_member.person_name as crew_member_name,
            crew_member.person_id as crew_member_id,
            movie_cast.character_name,
            movie_cast.cast_order,
            department.department_name,
            movie_crew.job
        FROM movie
        LEFT JOIN movie_cast ON movie.movie_id = movie_cast.movie_id
        LEFT JOIN person as actor ON movie_cast.person_id = actor.person_id
        LEFT JOIN movie_crew ON movie.movie_id = movie_crew.movie_id
        LEFT JOIN department ON movie_crew.department_id = department.department_id
        LEFT JOIN person as crew_member ON crew_member.person_id = movie_crew.person_id
        WHERE movie.movie_id = ?
    `;

    // Consulta SQL para obtener los datos de la película
    const small_data_query = `
        SELECT
            movie.*,
            language.language_name,
            genre.genre_name,
            country.country_name,
            production_company.company_name
        FROM movie
        LEFT JOIN movie_languages ON movie.movie_id = movie_languages.movie_id
        LEFT JOIN language ON movie_languages.language_id = language.language_id
        LEFT JOIN movie_genres ON movie.movie_id = movie_genres.movie_id
        LEFT JOIN genre ON movie_genres.genre_id = genre.genre_id
        LEFT JOIN production_country ON movie.movie_id = production_country.movie_id
        LEFT JOIN country ON production_country.country_id = country.country_id
        LEFT JOIN movie_company ON movie.movie_id = movie_company.movie_id
        LEFT JOIN production_company ON movie_company.company_id = production_company.company_id
        WHERE movie.movie_id = ?
    `;


    const keywords_query = `
        SELECT 
            movie.*, 
            keyword.keyword_name
        FROM movie
        LEFT JOIN movie_keywords ON movie.movie_id = movie_keywords.movie_id
        LEFT JOIN keyword ON movie_keywords.keyword_id = keyword.keyword_id
        WHERE movie.movie_id = ?;
    `;

    // Ejecutar la consulta
    db.all(crew_cast_query, [movieId], (err, crew_cast_rows) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error al cargar los datos de la película.');
        } else if (crew_cast_rows.length === 0) {
            res.status(404).send('Película no encontrada.');
        } else {
            db.all(small_data_query, [movieId], (err, small_data_rows) => {
                if (err) {
                    console.error(err);
                    res.status(500).send('Error al cargar los datos de la película.');
                } else if (small_data_rows.length === 0) {
                    res.status(404).send('Película no encontrada.');
                } else {
                    db.all(keywords_query, [movieId], (err, keyword_rows) => {
                        if (err) {
                            console.error(err);
                            res.status(500).send('Error al cargar los datos de la película.');
                        } else if (keyword_rows.length === 0) {
                            res.status(404).send('Película no encontrada.');
                        } else {

                            // Organizar los datos en un objeto de película
                            const movieData = {
                                id: small_data_rows[0].id,
                                title: small_data_rows[0].title,
                                release_date: small_data_rows[0].release_date,
                                overview: small_data_rows[0].overview,
                                directors: [],
                                writers: [],
                                cast: [],
                                crew: [],
                                language: small_data_rows[0].language_name,
                                genre: [],
                                vote: small_data_rows[0].vote_average,
                                runtime: small_data_rows[0].runtime,
                                country: small_data_rows[0].country_name,
                                company: small_data_rows[0].company_name,
                                keyword: []
                            };

                            keyword_rows.forEach((row) => {
                                if (row.keyword_name) {
                                    // Verificar si ya existe una entrada con los mismos valores en el elenco
                                    const isDuplicate = movieData.keyword.some((keyword) =>
                                        keyword.keyword_name === row.keyword_name
                                    );
                                    if (!isDuplicate) {
                                        // Si no existe, agregar los datos a la lista de elenco
                                        movieData.keyword.push({
                                            keyword_name: row.keyword_name,
                                        });
                                    }
                                }
                            });

                            // Crear un objeto para almacenar directores
                            crew_cast_rows.forEach((row) => {
                                if (row.crew_member_id && row.crew_member_name && row.department_name && row.job) {
                                    // Verificar si ya existe una entrada con los mismos valores en directors
                                    const isDuplicate = movieData.directors.some((crew_member) =>
                                        crew_member.crew_member_id === row.crew_member_id
                                    );

                                    if (!isDuplicate) {
                                        // Si no existe, agregar los datos a la lista de directors
                                        if (row.department_name === 'Directing' && row.job === 'Director') {
                                            movieData.directors.push({
                                                crew_member_id: row.crew_member_id,
                                                crew_member_name: row.crew_member_name,
                                                department_name: row.department_name,
                                                job: row.job,
                                            });
                                        }
                                    }
                                }
                            });

                            // Crear un objeto para almacenar writers
                            crew_cast_rows.forEach((row) => {
                                if (row.crew_member_id && row.crew_member_name && row.department_name && row.job) {
                                    // Verificar si ya existe una entrada con los mismos valores en writers
                                    const isDuplicate = movieData.writers.some((crew_member) =>
                                        crew_member.crew_member_id === row.crew_member_id
                                    );

                                    if (!isDuplicate) {
                                        // Si no existe, agregar los datos a la lista de writers
                                        if (row.department_name === 'Writing' && row.job === 'Writer') {
                                            movieData.writers.push({
                                                crew_member_id: row.crew_member_id,
                                                crew_member_name: row.crew_member_name,
                                                department_name: row.department_name,
                                                job: row.job,
                                            });
                                        }
                                    }
                                }
                            });

                            // Crear un objeto para almacenar el elenco
                            crew_cast_rows.forEach((row) => {
                                if (row.actor_id && row.actor_name && row.character_name) {
                                    // Verificar si ya existe una entrada con los mismos valores en el elenco
                                    const isDuplicate = movieData.cast.some((actor) =>
                                        actor.actor_id === row.actor_id
                                    );

                                    if (!isDuplicate) {
                                        // Si no existe, agregar los datos a la lista de elenco
                                        movieData.cast.push({
                                            actor_id: row.actor_id,
                                            actor_name: row.actor_name,
                                            character_name: row.character_name,
                                            cast_order: row.cast_order,
                                        });
                                    }
                                }
                            });

                            // Crear un objeto para almacenar el crew
                            crew_cast_rows.forEach((row) => {
                                if (row.crew_member_id && row.crew_member_name && row.department_name && row.job) {
                                    // Verificar si ya existe una entrada con los mismos valores en el crew
                                    const isDuplicate = movieData.crew.some((crew_member) =>
                                        crew_member.crew_member_id === row.crew_member_id
                                    );

                                    // console.log('movieData.crew: ', movieData.crew)
                                    // console.log(isDuplicate, ' - row.crew_member_id: ', row.crew_member_id)
                                    if (!isDuplicate) {
                                        // Si no existe, agregar los datos a la lista de crew
                                        if (row.department_name !== 'Directing' && row.job !== 'Director'
                                            && row.department_name !== 'Writing' && row.job !== 'Writer') {
                                            movieData.crew.push({
                                                crew_member_id: row.crew_member_id,
                                                crew_member_name: row.crew_member_name,
                                                department_name: row.department_name,
                                                job: row.job,
                                            });
                                        }
                                    }
                                }
                            });

                            // Crear un objeto para almacenar el genero
                            small_data_rows.forEach((row) => {
                                if (row.genre_name) {
                                    const isDuplicate = movieData.genre.some((genre) =>
                                        genre.genre_name === row.genre_name
                                    );
                                    if (!isDuplicate) {
                                        movieData.genre.push({
                                            genre_name: row.genre_name,
                                        });
                                    }
                                }
                            });
                            res.render('pelicula', { movie: movieData });
                        }
                    })
                }
            })
        }
    });
});

// Ruta para mostrar la página de un actor específico
app.get('/actor/:id', (req, res) => {
    const actorId = req.params.id;

    // Consulta SQL para obtener las películas en las que participó el actor
    const query = `
        SELECT DISTINCT
            person.person_name as actorName,
            movie.*
        FROM movie
        INNER JOIN movie_cast ON movie.movie_id = movie_cast.movie_id
        INNER JOIN person ON person.person_id = movie_cast.person_id
        WHERE movie_cast.person_id = ?;
  `;

    // Ejecutar la consulta
    db.all(query, [actorId], (err, movies) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error al cargar las películas del actor.');
        } else {
            // Obtener el nombre del actor
            const actorName = movies.length > 0 ? movies[0].actorName : '';

            res.render('actor', { actorName, movies });
        }
    });
});

// Ruta para mostrar la página de un director específico
app.get('/director/:id', (req, res) => {
    const directorId = req.params.id;

    // Consulta SQL para obtener las películas dirigidas por el director
    const query = `
    SELECT DISTINCT
      person.person_name as directorName,
      movie.*
    FROM movie
    INNER JOIN movie_crew ON movie.movie_id = movie_crew.movie_id
    INNER JOIN person ON person.person_id = movie_crew.person_id
    WHERE movie_crew.job = 'Director' AND movie_crew.person_id = ?;
  `;


    // console.log('query = ', query)

    // Ejecutar la consulta
    db.all(query, [directorId], (err, movies) => {
        if (err) {
            console.error(err);
            res.status(500).send('Error al cargar las películas del director.');
        } else {
            // console.log('movies.length = ', movies.length)
            // Obtener el nombre del director
            const directorName = movies.length > 0 ? movies[0].directorName : '';
            res.render('director', { directorName, movies });
        }
    });
});


// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor en ejecución en http://localhost:${port}`);
});
