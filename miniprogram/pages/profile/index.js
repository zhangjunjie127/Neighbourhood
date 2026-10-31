const api = require("../../services/api");

Page({
  data: { largeText: false },

  onShow() {
    this.setData({ largeText: api.getLargeText() });
  },

  onLargeTextChange(event) {
    api.setLargeText(event.detail.value);
    this.setData({ largeText: event.detail.value });
  },

  openFlow() {
    wx.switchTab({ url: "/pages/flow/index" });
  },

  openPartner() {
    wx.navigateTo({ url: "/pages/partner/index" });
  },

  resetDemo() {
    wx.showModal({
      title: "重置演示数据",
      content: "将清除本机保存的需求、服务方申请和处理记录。确定继续吗？",
      success: (result) => {
        if (!result.confirm) return;
        api.reset();
        wx.showToast({ title: "演示数据已重置", icon: "success" });
      }
    });
  }
});
