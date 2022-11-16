import { createPath } from 'history';
import {
  createElement,
  forwardRef,
  useCallback,
  useEffect,
  useState,
  useRef,
  MouseEvent,
  KeyboardEvent,
  FocusEvent,
} from 'react';

import { LinkProps, Route } from '../../common/types';
import { useTimeout, isImprovedPrefetchingEnabled } from '../../common/utils';
import {
  createRouterContext,
  generateLocationFromPath,
} from '../../common/utils';
import { useRouterStoreStatic } from '../../controllers/router-store';

import { getValidLinkType, handleNavigation } from './utils';

const improvedPrefetchingIsEnabled = isImprovedPrefetchingEnabled();

const PREFETCH_DELAY = improvedPrefetchingIsEnabled ? 225 : 300;

const Link = forwardRef<HTMLButtonElement | HTMLAnchorElement, LinkProps>(
  (
    {
      children,
      target = '_self',
      replace = false,
      href = undefined,
      to = undefined,
      onClick = undefined,
      onMouseEnter = undefined,
      onMouseLeave = undefined,
      onPointerDown = undefined,
      onFocus = undefined,
      onBlur = undefined,
      type: linkType = 'a',
      params,
      query,
      prefetch = false,
      ...rest
    },
    ref
  ) => {
    const routerActions = useRouterStoreStatic()[1];
    const prefetchRef = useRef<NodeJS.Timeout>();
    const { schedule, cancel } = useTimeout(PREFETCH_DELAY);

    const validLinkType = getValidLinkType(linkType);
    const [route, setRoute] = useState<Route | void>(() => {
      if (to && typeof to !== 'string') {
        if ('then' in to)
          to.then(r => setRoute('default' in r ? r.default : r));
        else return to;
      }
    });

    const routeAttributes = {
      params,
      query,
      basePath: routerActions.getBasePath(),
    };
    const linkDestination =
      href != null
        ? href
        : typeof to !== 'string'
        ? (route &&
            createPath(
              generateLocationFromPath(route.path, routeAttributes)
            )) ||
          ''
        : to;

    const triggerPrefetch = useCallback(() => {
      // ignore if async route not ready yet
      if (typeof to !== 'string' && !route) return;

      const context =
        typeof to !== 'string' && route
          ? createRouterContext(route, { params, query })
          : null;
      routerActions.prefetchNextRouteResources(linkDestination, context);
      // omit params & query as already in linkDestination
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [route, linkDestination, routerActions]);

    useEffect(() => {
      if (improvedPrefetchingIsEnabled) {
        if (prefetch === 'mount') {
          schedule(triggerPrefetch);
        }

        return cancel;
      }

      let timeout: NodeJS.Timeout;
      if (prefetch === 'mount')
        timeout = setTimeout(triggerPrefetch, PREFETCH_DELAY);

      return () => clearTimeout(timeout);
    }, [prefetch, schedule, cancel, triggerPrefetch]);

    const handleLinkPress = (e: MouseEvent | KeyboardEvent) =>
      handleNavigation(e, {
        onClick,
        target,
        replace,
        routerActions,
        href: linkDestination,
        to: route && [route, { params, query }],
      });

    const handleMouseEnter = (e: MouseEvent) => {
      if (prefetch === 'hover') {
        if (improvedPrefetchingIsEnabled) {
          schedule(triggerPrefetch);
        } else {
          prefetchRef.current = setTimeout(triggerPrefetch, PREFETCH_DELAY);
        }
      }
      onMouseEnter && onMouseEnter(e);
    };

    const handleMouseLeave = (e: MouseEvent) => {
      if (improvedPrefetchingIsEnabled && prefetch === 'hover') {
        cancel();
      } else if (prefetch === 'hover' && prefetchRef.current) {
        clearTimeout(prefetchRef.current);
        prefetchRef.current = undefined;
      }
      onMouseLeave && onMouseLeave(e);
    };

    const handleFocus = (e: FocusEvent<HTMLAnchorElement>) => {
      if (prefetch === 'hover') {
        schedule(triggerPrefetch);
      }
      onFocus && onFocus(e);
    };

    const handleBlur = (e: FocusEvent<HTMLAnchorElement>) => {
      if (prefetch === 'hover') {
        cancel();
      }
      onBlur && onBlur(e);
    };

    const handlePointerDown = (e: PointerEvent) => {
      if (prefetch === 'hover') {
        cancel();
        triggerPrefetch();
      }
      onPointerDown && onPointerDown(e);
    };

    return createElement(
      validLinkType,
      {
        ...rest,
        href: linkDestination,
        target,
        onClick: handleLinkPress,
        onKeyDown: handleLinkPress,
        onMouseEnter: handleMouseEnter,
        onMouseLeave: handleMouseLeave,
        ...(improvedPrefetchingIsEnabled
          ? {
              onFocus: handleFocus,
              onBlur: handleBlur,
              onPointerDown: handlePointerDown,
            }
          : undefined),
        ref,
      },
      children
    );
  }
);

Link.displayName = 'Link';

export default Link;
