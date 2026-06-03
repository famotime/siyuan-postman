interface HttpRouteConfig {
  useResendOnDesktop?: boolean
}

export function shouldUseHttpEmailRoute(isDesktop: boolean, httpConfig?: HttpRouteConfig): boolean {
  return !isDesktop || Boolean(httpConfig?.useResendOnDesktop)
}
