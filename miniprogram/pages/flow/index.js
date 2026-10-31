const api = require("../../services/api");
const { STATUS, STATUS_LABELS, availableActions } = require("../../domain/flow-machine");

const ACTION_LABELS = {
  respond: "响应需求并报价",
  decline: "暂不接单",
  select: "选择此服务方",
  proposeBooking: "确认服务单内容",
  confirmBooking: "确认预约",
  start: "开始服务",
  submitCompletion: "提交服务完成",
  complete: "确认服务完成",
  review: "提交 5 星评价",
  cancel: "取消未确认需求",
  requestCancel: "申请取消",
  approveCancel: "同意取消并关闭",
  rejectCancel: "不同意取消",
  requestReschedule: "申请改期",
  acceptReschedule: "同意改期",
  rejectReschedule: "保留原预约时间",
  complain: "提交投诉",
  proposeResolution: "提出处理结果",
  confirmResolution: "确认处理结果并关闭",
  reopenComplaint: "申请复核"
};

function formatTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value || "";
  return `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

Page({
  data: {
    role: "consumer",
    flow: null,
    hasDemand: false,
    largeText: false,
    statusLabel: "",
    statusTone: "",
    steps: [],
    actions: [],
    events: []
  },

  onShow() {
    this.refresh();
  },

  refresh() {
    const flow = api.getFlow();
    const role = api.getRole();
    const progress = {
      [STATUS.EMPTY]: 0,
      [STATUS.OPEN]: 1,
      [STATUS.RESPONDED]: 1,
      [STATUS.SELECTED]: 2,
      [STATUS.BOOKING_PROPOSED]: 2,
      [STATUS.BOOKED]: 3,
      [STATUS.IN_SERVICE]: 3,
      [STATUS.COMPLETION_PENDING]: 4,
      [STATUS.COMPLETED]: 5,
      [STATUS.CANCEL_REQUESTED]: 3,
      [STATUS.RESCHEDULE_REQUESTED]: 3,
      [STATUS.CANCELLED]: 0,
      [STATUS.COMPLAINT]: 5,
      [STATUS.RESOLUTION_PROPOSED]: 5,
      [STATUS.REOPENED]: 5,
      [STATUS.RESOLVED]: 5
    }[flow.status] || 0;
    const steps = ["发布需求", "服务响应", "预约确认", "服务履约", "完成评价"]
      .map((label, index) => ({ label, number: index + 1, done: index < progress }));
    const actions = availableActions(flow, role).map((key) => ({
      key,
      label: ACTION_LABELS[key] || key,
      primary: ["respond", "select", "proposeBooking", "confirmBooking", "start", "submitCompletion", "complete", "review", "confirmResolution", "acceptReschedule"].includes(key),
      danger: ["decline", "cancel", "approveCancel", "requestCancel", "complain", "reopenComplaint"].includes(key)
    }));
    const events = flow.events.map((event) => ({ ...event, time: formatTime(event.at) }));
    const statusTone = ["open", "responded", "selected", "booking_proposed", "cancel_requested", "reschedule_requested"].includes(flow.status)
      ? "status-warning"
      : ["cancelled", "complaint", "reopened"].includes(flow.status)
        ? "status-danger" : "";
    this.setData({
      flow,
      role,
      largeText: api.getLargeText(),
      hasDemand: flow.status !== STATUS.EMPTY,
      statusLabel: STATUS_LABELS[flow.status] || "",
      statusTone,
      steps,
      actions,
      events
    });
  },

  changeRole(event) {
    const role = event.currentTarget.dataset.role;
    api.setRole(role);
    this.refresh();
  },

  goPublish() {
    wx.navigateTo({ url: "/pages/publish/index" });
  },

  onAction(event) {
    const action = event.currentTarget.dataset.action;
    if (action === "complain") {
      wx.navigateTo({ url: "/pages/complaint/index" });
      return;
    }
    if (action === "requestCancel") {
      wx.showModal({
        title: "申请取消预约",
        content: "此为演示操作，会等待另一方回应；本机不会发送真实通知。",
        success: (result) => {
          if (result.confirm) this.dispatch(action);
        }
      });
      return;
    }
    if (action === "requestReschedule") {
      wx.showActionSheet({
        itemList: ["11月4日 上午", "11月4日 下午", "11月5日 上午"],
        success: (result) => this.dispatch(action, { proposedTime: ["2026-11-04 上午", "2026-11-04 下午", "2026-11-05 上午"][result.tapIndex] })
      });
      return;
    }
    if (action === "review") {
      wx.showActionSheet({
        itemList: ["5 星：非常满意", "4 星：满意", "3 星：一般"],
        success: (result) => this.dispatch(action, { rating: 5 - result.tapIndex })
      });
      return;
    }
    if (action === "cancel") {
      wx.showModal({
        title: "取消演示需求",
        content: "确定关闭当前尚未确认预约的需求吗？",
        success: (result) => {
          if (result.confirm) this.dispatch(action);
        }
      });
      return;
    }
    this.dispatch(action);
  },

  dispatch(action, extra = {}) {
    const flow = api.getFlow();
    const role = api.getRole();
    const actor = role;
    let payload = extra;
    if (action === "respond") {
      const name = flow.demand.providerName || (flow.demand.category === "上门助洁" ? "和邻居家清洁服务" : "安心陪诊 · 拱墅服务站");
      payload = {
        response: {
          providerId: flow.demand.providerId || "provider-demo-01",
          providerName: name,
          price: flow.demand.category === "上门助洁" ? 55 : 80,
          description: "服务范围已覆盖，可按需求时间响应。具体内容与费用以双方确认的服务单为准。"
        }
      };
    }
    if (action === "proposeBooking") {
      payload = {
        booking: {
          providerName: flow.response.providerName,
          time: flow.demand.time,
          price: flow.response.price,
          cancellationTerms: "双方确认预约后，取消或改期需由另一方回应；此演示不包含支付与退款。"
        }
      };
    }
    if (action === "proposeResolution") {
      payload = { resolution: "平台已模拟联系双方并记录处理建议；用户可确认关闭或申请复核。" };
    }
    try {
      api.dispatch(action, actor, payload);
      this.refresh();
      wx.showToast({ title: "演示状态已更新", icon: "success" });
    } catch (error) {
      wx.showToast({ title: error.message || "操作未完成", icon: "none" });
    }
  }
});
