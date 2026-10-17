export function resolveListenerConfig(env = process.env) {
  return {
    host: env.BEAMAL_HOST || (env.PORT ? '0.0.0.0' : '127.0.0.1'),
    port: Number(env.PORT || env.BEAMAL_PORT || 5180),
  };
}
