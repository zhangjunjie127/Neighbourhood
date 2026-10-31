const api = require("./services/api");

App({
  globalData: {
    api
  },
  onLaunch() {
    api.initialize();
  }
});
