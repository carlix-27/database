const express = require('express');
const sqlite3 = require('sqlite3');
// const ejs = require('ejs');
const session = require('express-session');

const app = express();
const port = process.env.PORT || 3000;

// Serve static files from the "views" directory
app.use(express.static('views'));

app.use(express.urlencoded({ extended: true }));

// Path completo de la base de datos movies.db
// Por ejemplo 'C:\\Users\\datagrip\\movies.db'
const db = new sqlite3.Database('./movies.db');

// habilitar foreign keys
db.run("PRAGMA foreign_keys = ON;", (err) => {
    if (err) {
      console.error("Error al habilitar foreign keys:", err.message);
    } else {
      console.log("Foreign key habilitadas.");
    }
  });

//configuro las sessions
app.use(session({
    secret: 'tp1',
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 60000 * 60 * 24 }
}));


// Configurar el motor de plantillas EJS
app.set('view engine', 'ejs');


// app.put('/edit-user', ())

// app.delete('/delete-user', ())



// Ruta para la página de inicio
app.get('/', (req, res) => {
    const isLoggedIn = req.session.isLoggedIn;
    const user = req.session.user;
    res.render('index', {isLoggedIn, user});
});

// Ruta para buscar películas
app.get('/buscar', (req, res) => {
    const searchTerm = req.query.q; // Name de la peli o lo que pongamos en el search.
    const filterSearch = req.query.filter; // movie, actor, director - array de filters.

    if(filterSearch){
        res.redirect(`/buscar-keywords/${searchTerm}`);
        return
    }

    const moviesQuery = `
            SELECT * 
            FROM movie 
            WHERE title LIKE ?
        `;

    const actorsQuery = `
        SELECT DISTINCT person.person_id AS person_id, person.person_name AS person_name
        FROM person
        WHERE person_name LIKE ?
    `;

    const directorsQuery = `
            SELECT DISTINCT person.person_id AS person_id, person.person_name AS person_name
            FROM person
            INNER JOIN main.movie_crew ON person.person_id = movie_crew.person_id
            WHERE movie_crew.job = 'Director' and person_name LIKE ?
        `;

    // Ejecutar las consultas

    db.all(moviesQuery, [`%${searchTerm}%`], (errMovies, movies) => {
        if (errMovies) {
            console.error(errMovies);
            return res.status(500).send('Error en la búsqueda de películas.');
        }

        db.all(actorsQuery, [`%${searchTerm}%`], (errActors, actors) => {
            if (errActors) {
                console.error(errActors);
                return res.status(500).send('Error en la búsqueda de actores.');
            }

            db.all(directorsQuery, [`%${searchTerm}%`], (errDirectors, directors) => {
                if (errDirectors) {
                    console.error(errDirectors);
                    return res.status(500).send('Error en la búsqueda de directores.');
                }

                // Renderizar la plantilla de resultados con películas, actores y directores
                res.render('resultado', { movies, actors, directors });
            });
        });
    });
});

// Ruta para buscar películas por keywords
app.get('/buscar-keywords/:keyword', (req, res) => {
    const searchTerm = req.params.keyword;

    const keywords_query = `
        SELECT 
            movie.*, 
            keyword.keyword_name
        FROM movie
        LEFT JOIN movie_keywords ON movie.movie_id = movie_keywords.movie_id
        LEFT JOIN keyword ON movie_keywords.keyword_id = keyword.keyword_id
        WHERE keyword.keyword_name LIKE ?;
    `;

    // Realizar la búsqueda en la base de datos
    db.all(keywords_query, [`%${searchTerm}%`], (err, rows) => {
            if (err) {
                console.error(err);
                res.status(500).send('Error en la búsqueda.');
            } else {
                res.render('keywords', { movies: rows });
            }
        }
    );
});

// Ruta para la página de datos de una película particular
app.get('/pelicula/:id', async (req, res) => {
    const movieId = req.params.id;
    const userId = req.session.userId;
    console.log('UserId: ', userId);
    const isLoggedIn = req.session.isLoggedIn;
    const user = req.session.user;

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

    const reviews_query = `
        SELECT movie_review.rating, movie_review.review, user.username
        from movie
        left join movie_review on movie.movie_id = movie_review.movie_id
        left join user on movie_review.user_id = user.id
        where movie.movie_id = ?;
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
                            db.all(reviews_query, [movieId], (err, reviews_rows ) => {
                                if (err) {
                                    res.status(500).send('Error al cargar los datos de los reviews.');
                                } else{
                                    // Organizar los datos en un objeto de película
                                    const movieData = {
                                        id: small_data_rows[0].movie_id,
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
                                        keyword: [],
                                        reviews: []
                                    };

                                    reviews_rows.forEach((row) => {
                                        if (row.review) {
                                            movieData.reviews.push({
                                                review: row.review,
                                                username: row.username,
                                                rating: row.rating
                                            });
                                        }
                                    });


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

                                    res.render('pelicula', { movie: movieData, isLoggedIn, user });
                                }
                            })
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


// Ruta para que el usuario pueda dejar un review
app.post('/pelicula/:id/review', (req, res) =>{
    const movieId = req.params.id;
    const userId = req.session.userId; // Para cualquier otro user
    // const userId = 1; // Para admin


    const review = req.body.review;
    const rating = req.body.rating; // Viene el value asociado al req.body.rating en front el radio.


    const checkReviewQuery = 'select * FROM movie_review where movie_review.movie_id = ? and movie_review.user_id =?';

    // Consulta SQL para agregar una review
    const reviewQuery = `INSERT INTO movie_review (movie_id, user_id, review, rating) VALUES (?, ?, ?, ?)`;

    db.get(checkReviewQuery, [movieId, userId], (err, existingReview) => {
        if(err){
            res.status(500).send('Error al verificar la pelicula');
        } else if(existingReview) {
            res.status(409).send('Ya existe una reseña de este usuario para esta pelicula');
        } else {
            db.run(reviewQuery,[movieId, userId, review, rating], (err) => {//crea el usuario en la db y redirige al usuario al login
                if (err) {
                    res.status(500).send('Error en el agregado de la reseña.');
                } else {
                    res.redirect(`/pelicula/${movieId}`);
                }
            });
        }
    })
});
// Ruta para guardar o eliminar una película como favorita.
app.get('/pelicula/:id/saved-list', (req, res) => {
    if (req.session.isLoggedIn) {
        const userId = req.session.userId;
        const movieId = req.params.id;

        // Query to check if the movie is already in the user's saved list
        const checkFavoriteQuery = 'SELECT * FROM saved_list WHERE user_id = ? AND movie_id = ?';

        db.get(checkFavoriteQuery, [userId, movieId], (err, row) => {
            if (err) {
                res.status(500).send('Error al verificar la película en la lista de favoritos.');
            } else {
                if (row) {
                    // Movie is already in the saved list, so remove it
                    const deleteFavoriteQuery = 'DELETE FROM saved_list WHERE user_id = ? AND movie_id = ?';
                    db.run(deleteFavoriteQuery, [userId, movieId], function (err) {
                        if (err) {
                            res.status(500).send('Error al eliminar la película de la lista de favoritos.');
                        } else {
                            res.redirect(`/pelicula/${movieId}`); // Redirect back to the movie page
                        }
                    });
                } else {
                    // Movie is not in the saved list, so add it
                    const insertFavoriteQuery = 'INSERT INTO saved_list (user_id, movie_id, fav) VALUES (?, ?, ?)';
                    db.run(insertFavoriteQuery, [userId, movieId, 1], function (err) { // Set fav to 1 (true) when adding
                        if (err) {
                            res.status(500).send('Error al guardar la película en la lista de favoritos.');
                        } else {
                            res.redirect(`/pelicula/${movieId}`); // Redirect back to the movie page
                        }
                    });
                }
            }
        });
    } else {
        res.redirect('/sign-in'); // Redirect to sign-in if the user is not logged in
    }
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


//creacion de usuario
app.get('/sign-up',(req,res) => {
    if(req.session.isLoggedIn){
        res.redirect('/');
    } else {
        res.render('newUser');
    }
});

app.post('/new-user',(req,res) =>{ 
    
    const checkUserQuery = 'select * FROM user where username = ?';
    const checkMailQuery = 'select * FROM user where email = ?';


    const query = 'INSERT INTO user (username, name, email, password, isAdmin) VALUES (?, ?, ?, ?, 0)';


    console.log(req.body);
    const name = req.body.name;
    const mail = req.body.email;
    const user = req.body.user;
    const pass = req.body.password;
    const passConfirm = req.body.passwordConfirmation;

    //confirmar que los campos esten completos y que las contraseñas sean iguales


    if(name.length != 0 && mail.length != 0 && user.length != 0  && pass != 0){
        if(passConfirm != pass){
            res.status(400).send('Las contraseñas no son identicas.');
        }else{
            db.get(checkUserQuery,[user],(err,username) => {//checkear que el usuario no exista
                if(err){
                    res.status(500).send('Error al verificar el usuario.');
                }else if (!username){ // Chequea que el array username este vacio. !username -> array vacio.

                    db.get(checkMailQuery,[mail],(err,email) => {//checkear que el mail no exista

                        if(err){
                            res.status(500).send('Error al verificar el email.');
                        }else if (!email){
                            db.run(query,[user,name,mail,pass], (err) => {//crea el usuario en la db y redirige al usuario al login
        
                                if(err){
                                    res.status(500).send('Error en la creacion de usuario.');
                                }else{
                                    res.render('login');
                                }
                            });
                        }else{
                            res.status(409).send('Email ya esta utilizado.');
                        }
                    })
                }else{
                    res.status(409).send('Usuario ya existe.');
                }
            })
        }
    }else{
        res.status(400).send('Campos vacios');
    }
});

app.get('/sign-in',(req,res) => {
    if(req.session.isLoggedIn){
        res.redirect('/');
    } else {
        res.render('login');
    }
});

//verificar la existencia del usuario y si su contraseña es valida
app.post('/log-in',(req,res) =>{

    const userQuery = 'select * FROM user where username = ?';

    const user = req.body.user; 
    const pass = req.body.password;


    db.get(userQuery,[user],(err,row)=>{    
        if(err){
            res.status(500).send('Error al verificar el usuario.');
        }else if(!row){
            res.status(400).send('Usuario no existe');
        }else if(pass === row.password ){
            req.session.user = row.username;//guarda el usuario
            req.session.userId = row.id; //guarda el id
            req.session.isLoggedIn = true;//guarda el loggin en la session
            if(row.isAdmin == 1){req.session.isAdmin = true;};
            if(row.id == 1){req.session.isSuperAdmin = true};
            res.redirect('/');
        }else{
            res.status(400).send('Contraseña incorrecta.');
        };
    });     
});

//Cierra la sesion del usuario
app.get('/log-out',(req,res) =>{
        req.session.destroy();
        res.redirect('/');
});

app.get('/user-admin',(req,res) =>{

    if(req.session.isAdmin){

        let query;
        const isSuperAdmin = req.session.isSuperAdmin;

        if(req.session.isSuperAdmin){
            query = 'select * FROM user WHERE id != 1';
        }else{
            query = 'select * FROM user WHERE isAdmin == 0';
        }
        

        db.all(query,(err,usersList) =>{
            if(err){
                res.status(500).send('Error al buscar usuarios.');
            }else{
                const users = {
                    user: []
                };
                usersList.forEach((row) => {
                    
                    users.user.push({
                        username: row.username,
                        userId: row.id,
                        email: row.email,
                        isAdmin: row.isAdmin
                    });
                    
                });
                res.render('adminUser' ,{ users: users, isSuperAdmin });
            };

        });
        
    }else{
        res.redirect('/');
    };

});

// Crea la página usuario
app.get('/usuario', (req, res) => {
    if (req.session.isLoggedIn) {
        const userId = req.session.userId; // Obtiene el ID del usuario conectado desde la sesión

        // Consulta para obtener datos específicos del usuario
        const userQuery = 'SELECT * FROM user WHERE id = ?';

        // Consulta modificada para obtener reseñas escritas por el usuario, incluyendo nombres de películas
        const reviewsQuery = `
            SELECT mr.review, mr.rating, m.title AS movie_name
            FROM movie_review mr
            JOIN movie m ON mr.movie_id = m.movie_id
            WHERE mr.user_id = ?;
        `;

        // Consulta para obtener las películas favoritas del usuario
        const favoritesQuery = `
            SELECT m.title AS movie_name
            FROM saved_list sl
            JOIN movie m ON sl.movie_id = m.movie_id
            WHERE sl.user_id = ? AND sl.fav = 1; // Asegura que solo se obtengan las películas favoritas
        `;

        db.get(userQuery, [userId], (err, userData) => {
            if (err) {
                res.status(500).send('Error al obtener la información del usuario.');
            } else if (!userData) {
                res.status(404).send('Usuario no encontrado.');
            } else {
                // Obtiene las reseñas escritas por el usuario
                db.all(reviewsQuery, [userId], (err, reviews) => {
                    if (err) {
                        res.status(500).send('Error al obtener las reseñas del usuario.');
                    } else {
                        // Obtiene las películas favoritas
                        db.all(favoritesQuery, [userId], (err, favorites) => {
                            if (err) {
                                res.status(500).send('Error al obtener las películas favoritas del usuario.');
                            } else {
                                // Renderiza la página del usuario con datos específicos del usuario, reseñas y películas favoritas
                                res.render('usuario', { user: userData, reviews: reviews, favorites: favorites });
                            }
                        });
                    }
                });
            }
        });
    } else {
        res.redirect('/sign-in'); // Redirige a la página de inicio de sesión si el usuario no está conectado
    }
});


app.post('/user-admin/reset-pass/:id',(req,res) =>{

    if(req.session.isAdmin){
        
        const id = req.params.id;
        
        const query = "UPDATE user SET password = '123' WHERE id = ?";

        db.run(query,[id],(err) =>{
            if(err){
                res.status(500).send('Error al resetear la contraseña.');
            }else{;
                res.redirect('/user-admin');
            }
        });

    }else{
        res.redirect('/');
    };

    
});

app.post('/user-admin/change-username/:id', (req,res) =>{

    if(req.session.isAdmin){
        
        const id = req.params.id;
        const newUser = req.body.newUser;
        
        if(newUser == null){res.redirect('/user-admin')};

        const query = "UPDATE user SET username = ? WHERE id = ?";
        
        db.run(query,[newUser,id],(err)=>{
            console.log(err)
            if(err.errno == 19){
                res.status(409).send('Usuario ya utilizado.');
            }else if(err){
                res.status(500).send('Error al cambiar el usuario.')
            }else{
                res.redirect('/user-admin');
            }

        });

    }else{
        res.redirect('/');
    };

    
});

app.post('/user-admin/delete-user/:id', (req,res) =>{

    if(req.session.isAdmin){
        
        const id = req.params.id;

        const query = "DELETE FROM user WHERE id = ?";

        db.run(query,[id],(err)=>{
            if(err){
                res.status(500).send('Error al borrar el usuario.');
            }else{
                res.redirect('/user-admin');
            };
        });

    }else{
        res.redirect('/');
    };
});

app.post('/user-admin/delete-reviews/:id', (req,res) =>{

    if(req.session.isAdmin){
        
        const id = req.params.id;

        const query = "UPDATE movie_review SET review = null WHERE user_id = ?";

        db.run(query,[id],(err)=>{
            if(err){
                res.status(500).send('Error al borrar las reseñas.')
            }else{
                res.redirect('/user-admin');
            }
        });
    }else{
        res.redirect('/');
    };
});

app.post('/user-admin/make-admin/:id',(req,res) =>{


    if(req.session.isSuperAdmin){

        const id = req.params.id
        const query = "UPDATE user SET isAdmin = 1 WHERE id = ?";

        db.run(query,[id],(err) =>{
            if(err){
                res.status(500).send('Error making admin.');
            }else{
                res.redirect('/user-admin');
            };
        });
    }else{
        res.redirect('/');
    };
});

app.post('/user-admin/remove-admin/:id',(req,res) =>{


    if(req.session.isSuperAdmin){

        const id = req.params.id
        const query = "UPDATE user SET isAdmin = 0 WHERE id = ?";

        db.run(query,[id],(err) =>{
            if(err){
                res.status(500).send('Error removing admin.');
            }else{
                res.redirect('/user-admin');
            };
        });
    }else{
        res.redirect('/');
    };
});






// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor en ejecución en http://localhost:${port}`);
});
