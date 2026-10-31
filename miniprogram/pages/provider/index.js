const api = require("../../services/api");

const PROVIDERS = {
  "provider-01": {
    name: "安心陪诊 · 拱墅服务站",
    region: "杭州 · 拱墅区",
    distance: "约 1.2 km",
    service: "陪同就医",
    category: "陪诊就医",
    price: 80,
    description: "陪同完成就诊流程，可协助路线指引、候诊和流程提醒。具体服务项目与时长以双方确认的服务单为准。"
  },
  "provider-02": {
    name: "和邻居家清洁服务",
    region: "杭州 · 拱墅区",
    distance: "约 2.4 km",
    service: "居家清洁",
    category: "上门助洁",
    price: 55,
    description: "提供居家基础清洁服务。服务区域、时长与清洁范围需在预约前确认。"
  }
};

Page({
  data: {
    provider: PROVIDERS["provider-01"],
    providerId: "provider-01",
    largeText: false
  },

  onShow() {
    this.setData({ largeText: api.getLargeText() });
  },

  onLoad(options) {
    const providerId = options.id || "provider-01";
    this.setData({
      providerId,
      provider: PROVIDERS[providerId] || PROVIDERS["provider-01"]
    });
  },

  createDemand() {
    wx.navigateTo({
      url: `/pages/publish/index?category=${encodeURIComponent(this.data.provider.category)}&region=${encodeURIComponent(this.data.provider.region)}&providerName=${encodeURIComponent(this.data.provider.name)}&providerId=${encodeURIComponent(this.data.providerId)}`
    });
  }
});
