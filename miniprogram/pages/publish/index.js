const api = require("../../services/api");

function todayString() {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
}

function dateAfter(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 10);
}

Page({
  data: {
    categoryOptions: ["陪诊就医", "上门助洁"],
    categoryIndex: 0,
    region: "杭州 · 拱墅区",
    today: todayString(),
    date: dateAfter(3),
    timeOptions: ["上午", "下午", "全天"],
    timeIndex: 0,
    mobilityOptions: ["不说明", "可自行行走", "需搀扶", "使用轮椅"],
    mobilityIndex: 0,
    note: "",
    providerName: "",
    providerId: "",
    largeText: false
  },

  onShow() {
    this.setData({ largeText: api.getLargeText() });
  },

  onLoad(options) {
    const categories = this.data.categoryOptions;
    const categoryIndex = categories.indexOf(decodeURIComponent(options.category || ""));
    this.setData({
      categoryIndex: categoryIndex >= 0 ? categoryIndex : 0,
      region: decodeURIComponent(options.region || this.data.region),
      providerName: decodeURIComponent(options.providerName || ""),
      providerId: options.providerId || ""
    });
  },

  onCategoryChange(event) {
    this.setData({ categoryIndex: Number(event.detail.value) });
  },

  onRegionInput(event) {
    this.setData({ region: event.detail.value });
  },

  onDateChange(event) {
    this.setData({ date: event.detail.value });
  },

  onTimeChange(event) {
    this.setData({ timeIndex: Number(event.detail.value) });
  },

  onMobilityChange(event) {
    this.setData({ mobilityIndex: Number(event.detail.value) });
  },

  onNoteInput(event) {
    this.setData({ note: event.detail.value });
  },

  submit() {
    const category = this.data.categoryOptions[this.data.categoryIndex];
    const region = this.data.region.trim();
    const time = `${this.data.date} ${this.data.timeOptions[this.data.timeIndex]}`;
    if (!region) {
      wx.showToast({ title: "请填写服务区域", icon: "none" });
      return;
    }

    try {
      api.setRole("consumer");
      api.dispatch("createDemand", "consumer", {
        category,
        region,
        time,
        demand: {
          category,
          region,
          time,
          mobility: this.data.mobilityIndex === 0 ? "未说明" : this.data.mobilityOptions[this.data.mobilityIndex],
          note: this.data.note.trim() || "暂无补充说明",
          providerName: this.data.providerName || "",
          providerId: this.data.providerId || ""
        }
      });
      wx.showToast({ title: "演示需求已发布", icon: "success" });
      setTimeout(() => wx.switchTab({ url: "/pages/flow/index" }), 350);
    } catch (error) {
      wx.showToast({ title: error.message, icon: "none" });
    }
  }
});
