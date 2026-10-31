const api = require("../../services/api");

Page({
  data: {
    categories: ["服务迟到", "服务内容与约定不符", "沟通问题", "其他"],
    categoryIndex: 0,
    resolutionOptions: ["希望平台协助沟通", "申请复核服务记录", "其他"],
    resolutionIndex: 0,
    description: "",
    largeText: false
  },

  onShow() {
    this.setData({ largeText: api.getLargeText() });
  },

  onCategoryChange(event) {
    this.setData({ categoryIndex: Number(event.detail.value) });
  },

  onResolutionChange(event) {
    this.setData({ resolutionIndex: Number(event.detail.value) });
  },

  onDescriptionInput(event) {
    this.setData({ description: event.detail.value });
  },

  submit() {
    const flow = api.getFlow();
    if (!this.data.description.trim()) {
      wx.showToast({ title: "请填写情况说明", icon: "none" });
      return;
    }
    try {
      api.dispatch("complain", api.getRole(), {
        complaint: {
          category: this.data.categories[this.data.categoryIndex],
          description: this.data.description.trim(),
          requestedResolution: this.data.resolutionOptions[this.data.resolutionIndex]
        }
      });
      wx.showToast({ title: "演示投诉已提交", icon: "success" });
      setTimeout(() => {
        wx.navigateBack({ delta: 1 });
      }, 300);
    } catch (error) {
      wx.showToast({ title: error.message || "提交失败", icon: "none" });
    }
  }
});
