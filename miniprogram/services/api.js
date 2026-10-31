const mock = require("./mock-adapter");

// Replace this adapter selection with an HTTP adapter after backend contracts are approved.
// Page code depends on this facade, never on wx Storage or network calls directly.
const adapter = mock;

module.exports = {
  initialize() {
    if (!wx.getStorageSync("neighbor-care-demo-role-v1")) adapter.setRole("consumer");
    if (!wx.getStorageSync("neighbor-care-demo-flow-v1")) adapter.reset();
  },
  dispatch: (...args) => adapter.dispatch(...args),
  getFlow: () => adapter.getFlow(),
  getLargeText: () => adapter.getLargeText(),
  getPartnerApplication: () => adapter.getPartnerApplication(),
  getRole: () => adapter.getRole(),
  reset: () => adapter.reset(),
  reviewPartnerApplication: (...args) => adapter.reviewPartnerApplication(...args),
  setRole: (...args) => adapter.setRole(...args),
  setLargeText: (...args) => adapter.setLargeText(...args),
  submitPartnerApplication: (...args) => adapter.submitPartnerApplication(...args)
};
