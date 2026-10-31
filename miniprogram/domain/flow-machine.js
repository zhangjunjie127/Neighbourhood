const STATUS = {
  EMPTY: "empty",
  OPEN: "open",
  RESPONDED: "responded",
  SELECTED: "selected",
  BOOKING_PROPOSED: "booking_proposed",
  BOOKED: "booked",
  IN_SERVICE: "in_service",
  COMPLETION_PENDING: "completion_pending",
  COMPLETED: "completed",
  CANCEL_REQUESTED: "cancel_requested",
  RESCHEDULE_REQUESTED: "reschedule_requested",
  CANCELLED: "cancelled",
  COMPLAINT: "complaint",
  RESOLUTION_PROPOSED: "resolution_proposed",
  REOPENED: "reopened",
  RESOLVED: "resolved"
};

const STATUS_LABELS = {
  empty: "暂无需求",
  open: "待服务方响应",
  responded: "已收到服务响应",
  selected: "待确认服务单",
  booking_proposed: "待服务方确认预约",
  booked: "预约已确认",
  in_service: "服务进行中",
  completion_pending: "待家属确认完成",
  completed: "服务已完成",
  cancel_requested: "取消申请处理中",
  reschedule_requested: "改期申请处理中",
  cancelled: "已取消",
  complaint: "投诉处理中",
  resolution_proposed: "待确认处理结果",
  reopened: "申请复核中",
  resolved: "流程已关闭"
};

const ACTIONS = {
  createDemand: { from: ["empty"], to: "open", actor: "consumer", title: "需求已发布，等待服务方响应" },
  respond: { from: ["open"], to: "responded", actor: "provider", title: "服务方响应需求并提交报价" },
  decline: { from: ["open", "booking_proposed"], to: "open", actor: "provider", title: "服务方暂不接单，需求继续开放" },
  select: { from: ["responded"], to: "selected", actor: "consumer", title: "家属已选择服务方" },
  proposeBooking: { from: ["selected"], to: "booking_proposed", actor: "consumer", title: "家属确认服务单内容，等待服务方确认" },
  confirmBooking: { from: ["booking_proposed"], to: "booked", actor: "provider", title: "服务方确认预约，服务单成立" },
  start: { from: ["booked"], to: "in_service", actor: "provider", title: "服务方已标记开始服务" },
  submitCompletion: { from: ["in_service"], to: "completion_pending", actor: "provider", title: "服务方提交服务完成" },
  complete: { from: ["completion_pending"], to: "completed", actor: "consumer", title: "家属确认服务完成" },
  review: { from: ["completed"], to: "completed", actor: "consumer", title: "家属提交服务评价" },
  cancel: { from: ["open", "responded", "selected", "booking_proposed"], to: "cancelled", actor: "consumer", title: "预约确认前需求已取消" },
  requestCancel: { from: ["booked", "in_service", "completion_pending"], to: "cancel_requested", actor: ["consumer", "provider"], title: "一方提出取消申请，等待另一方回应" },
  approveCancel: { from: ["cancel_requested"], to: "cancelled", actor: ["consumer", "provider", "ops"], title: "取消申请已同意，预约关闭" },
  rejectCancel: { from: ["cancel_requested"], to: "restore", actor: ["consumer", "provider"], title: "取消申请未通过，预约恢复" },
  requestReschedule: { from: ["booked"], to: "reschedule_requested", actor: ["consumer", "provider"], title: "一方提出改期申请，等待另一方回应" },
  acceptReschedule: { from: ["reschedule_requested"], to: "booked", actor: ["consumer", "provider", "ops"], title: "改期已确认，预约时间已更新" },
  rejectReschedule: { from: ["reschedule_requested"], to: "booked", actor: ["consumer", "provider"], title: "改期未通过，保留原预约时间" },
  complain: { from: ["booked", "in_service", "completion_pending", "completed"], to: "complaint", actor: ["consumer", "provider"], title: "投诉已提交，等待平台处理" },
  proposeResolution: { from: ["complaint", "reopened"], to: "resolution_proposed", actor: "ops", title: "平台提出处理结果，等待用户确认" },
  confirmResolution: { from: ["resolution_proposed"], to: "resolved", actor: "consumer", title: "用户确认处理结果，投诉关闭" },
  reopenComplaint: { from: ["resolution_proposed"], to: "reopened", actor: "consumer", title: "用户申请复核，投诉重新进入处理队列" }
};

function createEmptyFlow() {
  return {
    status: STATUS.EMPTY,
    demand: null,
    response: null,
    booking: null,
    complaint: null,
    rating: null,
    cancelActor: null,
    restoreStatus: null,
    rescheduleActor: null,
    proposedTime: null,
    events: []
  };
}

function actorAllowed(allowed, actor) {
  return Array.isArray(allowed) ? allowed.includes(actor) : allowed === actor;
}

function applyAction(flow, action, actor, payload = {}, timestamp = new Date().toISOString()) {
  const rule = ACTIONS[action];
  if (!rule) throw new Error("不支持的操作");
  if (!rule.from.includes(flow.status)) throw new Error("当前状态不允许此操作");
  if (!actorAllowed(rule.actor, actor)) throw new Error("当前角色无权执行此操作");
  if (action === "review" && flow.rating) throw new Error("此订单已评价");
  if (action === "approveCancel" || action === "rejectCancel" || action === "acceptReschedule" || action === "rejectReschedule") {
    const initiator = action.includes("Cancel") ? flow.cancelActor : flow.rescheduleActor;
    if (actor !== "ops" && initiator === actor) throw new Error("需由另一方回应此申请");
  }
  if (action === "createDemand" && (!payload.category || !payload.region || !payload.time)) {
    throw new Error("请填写服务类型、区域和时间");
  }

  const next = {
    ...flow,
    ...payload.updates,
    status: rule.to === "restore" ? flow.restoreStatus || STATUS.BOOKED : rule.to,
    events: [...flow.events]
  };

  if (action === "createDemand") {
    next.demand = {
      id: payload.demand.id || `D-${Date.now().toString().slice(-6)}`,
      ...payload.demand
    };
  }
  if (action === "respond") next.response = { ...payload.response };
  if (action === "proposeBooking") next.booking = { ...payload.booking, status: "proposed" };
  if (action === "confirmBooking") next.booking = { ...flow.booking, status: "confirmed" };
  if (action === "requestCancel") {
    next.cancelActor = actor;
    next.restoreStatus = flow.status;
  }
  if (action === "requestReschedule") {
    next.rescheduleActor = actor;
    next.proposedTime = payload.proposedTime;
  }
  if (action === "acceptReschedule") {
    next.booking = { ...flow.booking, time: flow.proposedTime, status: "confirmed" };
    next.proposedTime = null;
  }
  if (action === "rejectReschedule") next.proposedTime = null;
  if (action === "review") next.rating = payload.rating || 5;
  if (action === "complain") next.complaint = { ...payload.complaint, status: "submitted" };
  if (action === "proposeResolution") next.complaint = { ...flow.complaint, status: "resolution_proposed", resolution: payload.resolution || "平台已联系双方，建议按预约说明协商处理。" };

  next.events.unshift({
    id: `evt_${flow.events.length + 1}`,
    action,
    actor,
    title: payload.eventTitle || rule.title,
    at: timestamp
  });
  return next;
}

function availableActions(flow, actor) {
  return Object.entries(ACTIONS)
    .filter(([, rule]) => rule.from.includes(flow.status) && actorAllowed(rule.actor, actor))
    .filter(([action]) => {
      if (action === "review" && flow.rating) return false;
      if (["approveCancel", "rejectCancel"].includes(action) && flow.cancelActor === actor) return false;
      if (["acceptReschedule", "rejectReschedule"].includes(action) && flow.rescheduleActor === actor) return false;
      return true;
    })
    .map(([action]) => action);
}

module.exports = { ACTIONS, STATUS, STATUS_LABELS, applyAction, availableActions, createEmptyFlow };
