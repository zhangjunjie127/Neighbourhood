const api = require("../../services/api");

const STATUS_LABELS = {
  pending_review: "待审核",
  needs_update: "待补充",
  approved: "已通过（演示）",
  rejected: "未通过"
};

function formatEvents(events = []) {
  return events.map((event) => {
    const date = new Date(event.at);
    return {
      ...event,
      time: Number.isNaN(date.getTime()) ? "" : `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
    };
  }).reverse();
}

Page({
  data: {
    role: "provider",
    application: null,
    statusLabel: "",
    events: [],
    name: "",
    largeText: false,
    region: "杭州 · 拱墅区",
    categories: ["陪诊就医", "上门助洁"],
    categoryIndex: 0
  },

  onShow() {
    const role = api.getRole() === "ops" ? "ops" : "provider";
    this.setData({ role, largeText: api.getLargeText() });
    this.refresh();
  },

  refresh() {
    const application = api.getPartnerApplication();
    this.setData({
      application,
      statusLabel: application ? STATUS_LABELS[application.status] || "处理中" : "",
      events: application ? formatEvents(application.events) : []
    });
  },

  changeRole(event) {
    const role = event.currentTarget.dataset.role;
    api.setRole(role);
    this.setData({ role });
    this.refresh();
  },

  onNameInput(event) {
    this.setData({ name: event.detail.value });
  },

  onRegionInput(event) {
    this.setData({ region: event.detail.value });
  },

  onCategoryChange(event) {
    this.setData({ categoryIndex: Number(event.detail.value) });
  },

  submit() {
    const name = this.data.name.trim();
    if (!name) {
      wx.showToast({ title: "请填写演示服务主体名称", icon: "none" });
      return;
    }
    try {
      api.submitPartnerApplication({
        name,
        region: this.data.region.trim(),
        category: this.data.categories[this.data.categoryIndex]
      });
      this.refresh();
      wx.showToast({ title: "演示申请已提交", icon: "success" });
    } catch (error) {
      wx.showToast({ title: error.message, icon: "none" });
    }
  },

  review(event) {
    const decision = event.currentTarget.dataset.decision;
    const notes = {
      approve: "演示审核通过；真实上线仍须完成主体和资质核验。",
      request_more: "请补充服务范围和资质材料；本演示不上传真实文件。",
      reject: "演示申请未通过。"
    };
    try {
      api.reviewPartnerApplication(decision, notes[decision]);
      this.refresh();
      wx.showToast({ title: "演示审核已完成", icon: "success" });
    } catch (error) {
      wx.showToast({ title: error.message, icon: "none" });
    }
  }
});
