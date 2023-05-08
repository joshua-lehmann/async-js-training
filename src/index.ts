import { ApiMovie, ApiPerson, ApiPlanet, Movie, Result } from './interfaces.js';
import { httpGet } from './helper.js';

const PEOPLE_ENDPOINT = 'https://swapi.dev/api/peoples/1';

function fetchDataWithPromises(): Promise<Result> {
  return fetch(PEOPLE_ENDPOINT).then((response: any) => {
    return response.json().then((person: ApiPerson) => {
      // create promise to fetch planet
      const planetPromise: Promise<string> = fetch(person.homeworld).then((response: any) =>
        response.json().then((data: ApiPlanet) => data.name),
      );

      // create array of promises to fetch movies
      const moviePromises: Array<Promise<Movie>> = person.films.map((filmUrl: string) => {
        return fetch(filmUrl).then((response: any) => {
          return response.json().then((movie: ApiMovie) => {
            return {
              title: movie.title,
              director: movie.director,
              release_date: movie.release_date,
            };
          });
        });
      });

      // wait until all promises are resolved and combine data in final result object
      return Promise.all([planetPromise, ...moviePromises]).then(([planetName, ...movies]) => {
        const {name, gender, height} = person;
        const result: Result = {
          name,
          gender,
          height,
          homeworld: planetName,
          films: movies,
        };
        return result;
      });
    });
  });
}

async function fetchDataWithAsyncAwait(): Promise<Result> {
  const person: ApiPerson = await fetch(PEOPLE_ENDPOINT).then((response: any) => response.json());

  // Planet can only be fetched after person is fetched, so await person promise to resolve
  // Theoretically we could even parallelize the planet and all movie requests since they are not dependent on each other, however I skipped this for simplicity
  const planetName: string = await fetch(person.homeworld).then((response: any) =>
    response.json().then((data: ApiPlanet) => data.name),
  );

  // Movies can be fetched in parallel, so wait for all movie promises to resolve
  const movies: Array<Movie> = await Promise.all(
    person.films.map((filmUrl: string) => {
      return fetch(filmUrl).then((response: any) =>
        response.json().then((movie: ApiMovie) => {
          return {
            title: movie.title,
            director: movie.director,
            release_date: movie.release_date,
          };
        }),
      );
    }),
  );

  // Combine data in final result object
  const {name, gender, height} = person;
  return {name, gender, height, homeworld: planetName, films: movies};
}

function getLukeSkywalkerInfoCallback(callback, error) {
  return httpGet(
    PEOPLE_ENDPOINT,
    (person) => {
      const {name, gender, height} = person;

      /**
       * @description Callback function which takes in an ApiMovie object and only returns the title, director and release_date
       * @param film
       */
      const processMovie = (film: ApiMovie) => {
          return {
            title: film.title,
            director: film.director,
            release_date: film.release_date,
        };
      };

      /**
       * @description Callback function which takes in an ApiPlanet object and only returns the name. Also the final callback so here we have access to all data and can combine it
       * @param planet
       */
      const processPlanet = (planet: ApiPlanet) => {
        // Combine the data from all requests into the final result object
        const result = {
          name,
          gender,
          height,
          films: movies,
          homeworld: planet.name,
        };
        callback(result);
      };

      const movies: Array<Movie> = [];
      const movieUrls = person.films;

      // Manually track the number of callbacks remaining to know when we have all movie data
      // Probably similar to what the whenAllCallback function does but I was not able to get it to work with using it, so I implemented it myself
      let callbacksRemaining = movieUrls.length;
      for (let i = 0; i < movieUrls.length; i++) {
        httpGet(
          movieUrls[i],
          (apiMovie: ApiMovie) => {
            // process movie data and add to movies array
            const movie: Movie = processMovie(apiMovie);
            movies.push(movie);
            --callbacksRemaining;
            if (callbacksRemaining <= 0) {
              // last movie callback, so we know that we have all movie data now and can call the planet requests
              httpGet(person.homeworld, processPlanet, error);
            }
          },
          error,
        );
      }
    },
    error,
  );
}

// Call the function which returns a promise and log the result
fetchDataWithPromises()
  .then((result: Result) => console.log('Final Promise result', result))
  .catch((error) => console.log('error happened', error));

// Call the async function returns the data and log the result
fetchDataWithAsyncAwait()
  .then((result: Result) => console.log('Final async/await result', result))
  .catch((error) => console.log('error happened', error));

// Call the function which uses callbacks and log the result
getLukeSkywalkerInfoCallback(
  (result) => console.log('Final callback result', result),
  (error) => console.log('error happened', error),
);
