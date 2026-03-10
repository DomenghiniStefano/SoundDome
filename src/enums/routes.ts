export const RoutePath = {
  ROOT: '/',
  SPLASH: '/splash',
  BROWSE: '/browse',
  LIBRARY: '/library',
  EDIT_SOUND: '/library/edit/:id',
  STREAM_DECK: '/streamdeck',
  SETTINGS: '/settings',
  WIDGET: '/widget',
} as const;

export type RoutePathValue = (typeof RoutePath)[keyof typeof RoutePath];

export const RouteName = {
  SPLASH: 'splash',
  BROWSE: 'browse',
  LIBRARY: 'library',
  EDIT_SOUND: 'edit-sound',
  STREAM_DECK: 'streamdeck',
  SETTINGS: 'settings',
  WIDGET: 'widget',
} as const;

export type RouteNameValue = (typeof RouteName)[keyof typeof RouteName];
