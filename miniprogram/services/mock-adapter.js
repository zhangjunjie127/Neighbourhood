const { applyAction, createEmptyFlow } = require("../domain/flow-machine");

const FLOW_KEY = "neighbor-care-demo-flow-v1";
const ROLE_KEY = "neighbor-care-demo-role-v1";
const PARTNER_KEY = "neighbor-care-demo-partner-v1";
const LARGE_TEXT_KEY = "neighbor-care-demo-large-text-v1";

function read(key, fallback) {
  const value = wx.getStorageSync(key);
  return value === "" || value === undefined ? fallback : value;
}

function write(key, value) {
  wx.setStorageSync(key, value);
  return value;
}

function getFlow() {
  return read(FLOW_KEY, createEmptyFlow());
}

function dispatch(action, actor, payload) {
  const next = applyAction(getFlow(), action, actor, payload);
  write(FLOW_KEY, next);
  return next;
}

function getPartnerApplication() {
  return read(PARTNER_KEY, null);
}

function submitPartnerApplication(application) {
  const existing = getPartnerApplication();
  if (existing && existing.status === "approved") throw new Error("服务方已通过演示审核");
  const next = {
    id: existing ? existing.id : "partner-demo-01",
    ...application,
    status: "pending_review",
    updatedAt: new Date().toISOString(),
    events: [...(existing && existing.events ? existing.events : []), {
      title: "服务方资料已提交，等待平台审核",
      actor: "服务方",
      at: new Date().toISOString()
    }]
  };
  return write(PARTNER_KEY, next);
}

function reviewPartnerApplication(decision, note) {
  const current = getPartnerApplication();
  if (!current || current.status !== "pending_review") throw new Error("当前没有待审核的服务方申请");
  const labels = {
    approve: ["approved", "平台审核通过，演示服务已上架"],
    request_more: ["needs_update", "平台要求补充资料"],
    reject: ["rejected", "平台审核未通过"]
  };
  if (!labels[decision]) throw new Error("不支持的审核操作");
  const [status, title] = labels[decision];
  const next = {
    ...current,
    status,
    reviewNote: note || "",
    updatedAt: new Date().toISOString(),
    events: [...current.events, { title, actor: "平台运营", at: new Date().toISOString() }]
  };
  return write(PARTNER_KEY, next);
}

function reset() {
  const flow = createEmptyFlow();
  write(FLOW_KEY, flow);
  wx.removeStorageSync(PARTNER_KEY);
  write(ROLE_KEY, "consumer");
  return flow;
}

function setRole(role) {
  return write(ROLE_KEY, role);
}

function setLargeText(enabled) {
  return write(LARGE_TEXT_KEY, Boolean(enabled));
}

module.exports = {
  dispatch,
  getFlow,
  getPartnerApplication,
  getLargeText: () => Boolean(read(LARGE_TEXT_KEY, false)),
  getRole: () => read(ROLE_KEY, "consumer"),
  reset,
  reviewPartnerApplication,
  setRole,
  setLargeText,
  submitPartnerApplication
};
