const test = require("node:test");
const assert = require("node:assert/strict");
const { applyAction, availableActions, createEmptyFlow, STATUS } = require("../domain/flow-machine");

const tick = "2026-10-31T09:00:00+08:00";
const demand = { category: "陪诊就医", region: "杭州·拱墅区", time: "2026-11-03 上午" };

function toBooked() {
  let flow = createEmptyFlow();
  flow = applyAction(flow, "createDemand", "consumer", { demand, category: demand.category, region: demand.region, time: demand.time }, tick);
  flow = applyAction(flow, "respond", "provider", { response: { providerName: "安心陪诊", price: 80 } }, tick);
  flow = applyAction(flow, "select", "consumer", {}, tick);
  flow = applyAction(flow, "proposeBooking", "consumer", { booking: { time: demand.time, price: 80 } }, tick);
  return applyAction(flow, "confirmBooking", "provider", {}, tick);
}

test("家属与服务方可完成需求到订单确认的关键闭环", () => {
  const flow = toBooked();
  assert.equal(flow.status, STATUS.BOOKED);
  assert.equal(flow.events.length, 5);
  assert.equal(flow.booking.status, "confirmed");
});

test("服务可从开始推进到完成并提交单次评价", () => {
  let flow = toBooked();
  flow = applyAction(flow, "start", "provider", {}, tick);
  flow = applyAction(flow, "submitCompletion", "provider", {}, tick);
  flow = applyAction(flow, "complete", "consumer", {}, tick);
  flow = applyAction(flow, "review", "consumer", { rating: 4 }, tick);
  assert.equal(flow.status, STATUS.COMPLETED);
  assert.equal(flow.rating, 4);
  assert.throws(() => applyAction(flow, "review", "consumer", {}, tick), /已评价/);
});

test("只有另一方可以回应取消申请，运营可介入同意", () => {
  const flow = applyAction(toBooked(), "requestCancel", "consumer", {}, tick);
  assert.throws(() => applyAction(flow, "approveCancel", "consumer", {}, tick), /另一方回应/);
  assert.equal(applyAction(flow, "approveCancel", "ops", {}, tick).status, STATUS.CANCELLED);
});

test("拒绝改期保留原预约时间，确认改期则更新快照", () => {
  const original = toBooked();
  const pending = applyAction(original, "requestReschedule", "consumer", { proposedTime: "2026-11-04 上午" }, tick);
  assert.equal(availableActions(pending, "consumer").includes("acceptReschedule"), false);
  const updated = applyAction(pending, "acceptReschedule", "provider", {}, tick);
  assert.equal(updated.status, STATUS.BOOKED);
  assert.equal(updated.booking.time, "2026-11-04 上午");
});

test("投诉处理需用户确认，用户也可申请复核", () => {
  let flow = applyAction(toBooked(), "complain", "consumer", { complaint: { description: "服务与约定不符" } }, tick);
  flow = applyAction(flow, "proposeResolution", "ops", { resolution: "已完成沟通" }, tick);
  assert.equal(flow.status, STATUS.RESOLUTION_PROPOSED);
  flow = applyAction(flow, "reopenComplaint", "consumer", {}, tick);
  assert.equal(flow.status, STATUS.REOPENED);
  flow = applyAction(flow, "proposeResolution", "ops", {}, tick);
  flow = applyAction(flow, "confirmResolution", "consumer", {}, tick);
  assert.equal(flow.status, STATUS.RESOLVED);
});

test("不允许跳过服务方预约确认或由错误角色推进状态", () => {
  const flow = applyAction(createEmptyFlow(), "createDemand", "consumer", { demand, category: demand.category, region: demand.region, time: demand.time }, tick);
  assert.throws(() => applyAction(flow, "start", "provider", {}, tick), /当前状态/);
  assert.throws(() => applyAction(flow, "respond", "consumer", {}, tick), /无权/);
});
