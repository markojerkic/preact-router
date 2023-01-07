import { signal } from "@preact/signals";
import { ComponentChildren, FunctionComponent } from "preact";
import { useCallback, useEffect, useMemo, useState } from "preact/hooks";
import { JSXInternal } from "preact/src/jsx";
import {
  objectInputType,
  objectOutputType,
  UnknownKeysParam,
  ZodObject,
  ZodRawShape,
  ZodTypeAny,
} from "zod";
import {
  AsyncRoute,
  AsyncRouteOptions,
  AsyncRouteParamsWithOptionalQueryParams,
  Route,
  RouteOptions,
  RouteParamsWithOptionalQueryParams,
} from "./types";

const splitRoute = (route: string) =>
  route.split("/").filter((part) => !!part && part !== "");

const createPathParts = (route: string) => {
  const pathParts = splitRoute(route).map((pathPart) => ({
    name: pathPart.replace("[", "").replace("]", "").replace("?", ""),
    isVariable: pathPart.includes("[") && pathPart.includes("]"),
    isOptional: pathPart.includes("?"),
  }));
  return pathParts;
};

const matches = <
  TRoute extends string,
  TValidType extends ZodRawShape,
  UnknownKeys extends UnknownKeysParam = "strip",
  Catchall extends ZodTypeAny = ZodTypeAny,
  Output = objectOutputType<TValidType, Catchall>
>({
  currentRoute: route,
  routerPattern: testRoute,
}: {
  currentRoute: string;
  routerPattern: TRoute;
}):
  | RouteParamsWithOptionalQueryParams<
      TRoute,
      TValidType,
      UnknownKeys,
      Catchall,
      Output
    >
  | undefined => {
  const routeParts = createPathParts(testRoute);

  const currentRouteParts = splitRoute(route);
  if (currentRouteParts.length > routeParts.length) {
    return undefined;
  }
  let pathParams: { [key: string]: string | undefined } = {};
  let routePart = routeParts.shift();
  while (routePart) {
    if (currentRouteParts.length <= 0 && !routePart.isOptional) {
      return undefined;
    }
    let currentRoutePart = currentRouteParts.shift();
    if (!currentRoutePart && !routePart.isOptional) {
      return undefined;
    }
    if (!routePart.isVariable) {
      if (currentRoutePart !== routePart.name) {
        return undefined;
      }
    } else if (routePart.isVariable) {
      if (routePart.isOptional) {
        if (
          routeParts.find((rp) => !rp.isVariable && !rp.isOptional)?.name ===
          currentRoutePart
        ) {
          pathParams[routePart.name] = undefined;
          routePart = routeParts.shift();
        } else {
          pathParams[routePart.name] = currentRoutePart;
        }
      } else {
        pathParams[routePart.name] = currentRoutePart;
      }
    }
    routePart = routeParts.shift();
  }
  return {
    ...pathParams,
    queryParams: currentQueryParams.value,
  } as RouteParamsWithOptionalQueryParams<
    TRoute,
    TValidType,
    UnknownKeys,
    Catchall,
    Output
  >;
};

const routeTo = <
  TRoute extends string,
  TValidType extends ZodRawShape,
  UnknownKeys extends UnknownKeysParam = "strip",
  Catchall extends ZodTypeAny = ZodTypeAny,
  Output = objectOutputType<TValidType, Catchall>
>({
  routePattern,
  routeParams,
}: {
  routePattern: TRoute;
  routeParams: AsyncRouteParamsWithOptionalQueryParams<
    TRoute,
    TValidType,
    UnknownKeys,
    Catchall,
    Output
  >;
}) => {
  const pathWithoutLeadingSlash = routePattern
    .split("/")
    .filter((part) => part !== "")
    .map((part) => {
      if (part.startsWith("[") && part.endsWith("]")) {
        part = part.replace("[", "").replace("]", "").replace("?", "");
        const partCast = part as TRoute;

        return (routeParams as any)[partCast];
      }
      return part;
    })
    .join("/");
  return {
    path: pathWithoutLeadingSlash.startsWith("/")
      ? pathWithoutLeadingSlash
      : `/${pathWithoutLeadingSlash}`,
    queryParams: routeParams.queryParams,
  };
};

const routeObjectToPath = ({
  path,
  queryParams,
}: {
  path: string;
  queryParams: any;
}) => {
  let queryParamsString;
  if (queryParams) {
    queryParamsString = Object.keys(queryParams)
      .filter((key) => Object.hasOwn(queryParams, key))
      // @ts-ignore
      .map((key) => ({ key, value: queryParams[key] }))
      .map((entry) => {
        if (Array.isArray(entry.value)) {
          return entry.value.map((value) => `${entry.key}=${value}`).join("&");
        }
        return `${entry.key}=${entry.value}`;
      })
      .join("&");
  }
  return `${path}${
    queryParamsString && queryParamsString !== "" ? `?${queryParamsString}` : ""
  }`;
};

const changePath = ({
  path,
  queryParams,
}: {
  path: string;
  queryParams: any;
}) => {
  window.history.pushState(
    { manual: true },
    "",
    routeObjectToPath({ path, queryParams })
  );
  currentRoute.value = path;
  currentQueryParams.value = queryParams;
};

export const createAsyncRoute = <
  TRoute extends string,
  TValidType extends ZodRawShape,
  UnknownKeys extends UnknownKeysParam = "strip",
  Catchall extends ZodTypeAny = ZodTypeAny,
  Output = objectOutputType<TValidType, Catchall>,
  Input = objectInputType<TValidType, Catchall>
>({
  routePattern,
  renderComponent,
}: AsyncRouteOptions<
  TRoute,
  TValidType,
  UnknownKeys,
  Catchall,
  Output,
  Input
>) => {
  return {
    isAsync: true,
    renderComponent,
    routePattern,
    routeTo: (
      routeParams: AsyncRouteParamsWithOptionalQueryParams<
        TRoute,
        TValidType,
        UnknownKeys,
        Catchall,
        Output
      >
    ) => changePath(routeTo({ routePattern, routeParams })),
  };
};

const LinkComponent: FunctionComponent<{
  props: RouteParamsWithOptionalQueryParams<string, ZodRawShape>;
  routePattern: string;
}> = ({ props, routePattern, children }) => {
  return (
    <a href={""}>
      <div>
        {routePattern}
        {children}
      </div>
    </a>
  );
};

export const createRoute = <
  TRoute extends string,
  TValidType extends ZodRawShape,
  UnknownKeys extends UnknownKeysParam = "strip",
  Catchall extends ZodTypeAny = ZodTypeAny,
  Output = objectOutputType<TValidType, Catchall>,
  Input = objectInputType<TValidType, Catchall>
>({
  searchParamsValidator,
  routePattern,
  renderComponent,
}: RouteOptions<TRoute, TValidType, UnknownKeys, Catchall, Output, Input>) => {
  return {
    isAsync: false,
    renderComponent,
    routePattern,
    Link: ({
      routeParams,
      children,
    }: {
      routeParams: RouteParamsWithOptionalQueryParams<
        TRoute,
        TValidType,
        UnknownKeys,
        Catchall,
        Output
      >;
      children?: ComponentChildren;
    }) => {
      const routeObject = useMemo(
        () => routeTo({ routePattern, routeParams }),
        [routeParams, routePattern]
      );

      const href = useMemo(() => routeObjectToPath(routeObject), [routeObject]);
      const handleClick = useCallback(
        (e: Event) => {
          e.preventDefault();
          changePath(routeObject);
        },
        [routeObject]
      );

      return (
        <a href={href} onClick={handleClick}>
          <div>{children}</div>
        </a>
      );
    },
    searchParamsValidator,
    routeTo: (
      routeParams: RouteParamsWithOptionalQueryParams<
        TRoute,
        TValidType,
        UnknownKeys,
        Catchall,
        Output
      >
    ) => changePath(routeTo({ routePattern, routeParams })),
  };
};

const parseWindowQueryParams = () => {
  const params = new Map<string, string[]>();
  const entriesIterator = new URLSearchParams(window.location.search).entries();
  let entry = entriesIterator.next();
  while (!entry.done) {
    let values = params.get(entry.value[0]);
    if (!values) {
      values = [entry.value[1]];
    } else {
      values = [...values, entry.value[1]];
    }
    params.set(entry.value[0], values);
    entry = entriesIterator.next();
  }

  return Object.fromEntries(params.entries());
};

const currentRoute = signal(window.location.pathname);
const currentQueryParams = signal(parseWindowQueryParams());

export const createRouter = <TRoutes extends { [routeName: string]: string }>(
  routes: {
    [TRoute in keyof TRoutes]:
      | Route<TRoutes[TRoute]>
      | AsyncRoute<TRoutes[TRoute]>;
  },
  noRoutesMatch: () => JSXInternal.Element
) => {
  const sortedRoutes = useMemo(
    () =>
      Object.keys(routes)
        .map((route) => routes[route])
        .sort((a, b) => {
          const aPartsLength = a.routePattern
            .split("/")
            .filter((p: string) => typeof p === "string" && p !== "").length;
          const bPartsLength = b.routePattern
            .split("/")
            .filter((p: string) => typeof p === "string" && p !== "").length;
          if (aPartsLength === bPartsLength) {
            return 0;
          } else if (aPartsLength > bPartsLength) {
            return 1;
          }
          return -1;
        }),
    [currentRoute.value, currentQueryParams.value, routes]
  );

  const updateCurrentLocation = useCallback(() => {
    currentRoute.value = window.location.pathname;
  }, []);

  useEffect(() => {
    window.addEventListener("popstate", updateCurrentLocation);
    return () => window.removeEventListener("popstate", updateCurrentLocation);
  }, [currentRoute.value]);

  const match = useMemo(
    () =>
      sortedRoutes
        .map((route) => ({
          route: route.routePattern,
          match: matches({
            currentRoute: currentRoute.value,
            routerPattern: route.routePattern,
          }),
          renderComponent: route.renderComponent,
          searchParamsValidator: route.searchParamsValidator,
          isAsync: route.isAsync,
        }))
        .find((match) => {
          return !!match && !!match.match;
        }),
    [matches, currentQueryParams.value, currentRoute.value]
  );

  if (!match || !match?.match) {
    return { Router: noRoutesMatch, routes };
  }

  if (
    currentQueryParams.value &&
    !Object.is(currentQueryParams, {}) &&
    match.searchParamsValidator &&
    !(match.searchParamsValidator as ZodObject<any>).safeParse(
      currentQueryParams.value
    ).success
  ) {
    return { Router: () => <div>Query params are not valid</div>, routes };
  }

  // FIXME: Ts server goes crazy if directly passed
  const matchedProps = match.match; //useMemo(() => match.match, [match.match]);

  return {
    Router: () => {
      if (!match.isAsync) {
        return <>{match.renderComponent(matchedProps)}</>;
      }
      const [asyncComponent, setAsyncComponent] = useState();
      useEffect(() => {
        const load = async () => {
          setAsyncComponent(await match.renderComponent(matchedProps));
        };
        load();
      }, []);
      if (!asyncComponent) {
        return <>Loading...</>;
      }
      return <>{asyncComponent}</>;
    },
    routes,
  };
};
