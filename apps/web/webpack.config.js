export default (config) => {
  config.watchOptions = {
    poll: 1000,
    aggregateTimeout: 300,
    ignored: /node_modules/,
  };
  return config;
};