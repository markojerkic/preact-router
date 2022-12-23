import { createAsyncRoute, createRoute, createRouter } from "./router";
import { useCallback, useEffect, useMemo } from 'preact/hooks';
import { signal } from "@preact/signals";
import { objectInputType, objectOutputType, UnknownKeysParam, z, ZodAny, ZodObject, ZodRawShape, ZodSchema, ZodTypeAny } from "zod";


const TestComponent = ({ lastname, id }: { lastname?: string, id: string }) => {
  return (
    <>
      <div className='bg-blue-200'>
        <p>Prezime: {lastname}</p>
        <div>Id: {id}</div>
      </div>
    </>
  );
}


const TestComponent2 = ({ country, player }: { country: string, player: string }) => {

  const toPerson = useCallback(() => {
    routes.value.lastNameId.routeTo({ lastname: 'jerkic' })
  }, []);
  return (
    <>
      <div className='bg-red-200'>
        <p>Zemlja: {country}</p>
        <div>Igrač: {player}</div>
        <button className='bg-blue-300' onClick={() => toPerson()}>Idemo na osobu jerkic</button>
      </div>
    </>
  );
}

const validator = z.object({ ime: z.string(), prezime: z.string().optional() });

export const routes = signal({
  plyersCountry: createRoute({
    routePattern: '/players/[country]/[playername]',
    renderComponent: (props) => <TestComponent2 country={props.country} player={props.playername} />,
    searchParamsValidator: validator
  }),
  lastNameId: createRoute({
    routePattern: '/[id?]/ime/[lastname]',
    renderComponent: (props) => <TestComponent lastname={props.lastname} id={props.id ?? 'name id'} />,
  }),
  asyncRoute: createAsyncRoute({
    routePattern: '/async/[route]',
    renderComponent: (props) => import('./async').then(module => (<module.AsyncComponent route={props.route} />)),
  })

});

routes.value.plyersCountry.routeTo({ playername: 'luka', country: 'hrv', queryParams: {ime: 'marko'} })

export function App() {
  const router = createRouter(routes.value);

  const toPersonWithId = useCallback(() => {
    routes.value.lastNameId.routeTo({ id: 'marko', lastname: 'jerkic' })
  }, []);

  const toPerson = useCallback(() => {
    routes.value.lastNameId.routeTo({ lastname: 'jerkic' })
  }, []);

  const toPlayer = useCallback(() => {
    routes.value.plyersCountry.routeTo({ playername: 'stipe', country: 'hrv' })
  }, []);

  const toAsyncRoute = useCallback(() => {
    routes.value.asyncRoute.routeTo({ route: 'neka' })
  }, []);

  return (
    <>
      <p>Bok, ovo je moj router :)</p>
      <div class='flex space-x-4 my-4'>
        <button className='bg-red-300' onClick={() => toPlayer()}>Idemo na igrač stipe iz hrv</button>
        <button className='bg-blue-300' onClick={() => toPerson()}>Idemo na osobu jerkic</button>
        <button className='bg-blue-300' onClick={() => toPersonWithId()}>Idemo na osobu jerkic s identifikatorom</button>
        <button className='bg-fuchsia-300' onClick={() => toAsyncRoute()}>Idemo na async rutu</button>
      </div>
      <router.Router />
    </>
  )
}