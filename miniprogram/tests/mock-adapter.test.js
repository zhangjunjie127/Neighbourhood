const test = require("node:test");
const assert = require("node:assert/strict");

const storage = new Map();
global.wx = {
  getStorageSync: (key) => storage.has(key) ? storage.get(key) : "",
  setStorageSync: (key, value) => storage.set(key, value),
  removeStorageSync: (key) => storage.delete(key)
};

const adapter = require("../services/mock-adapter");

test("服务方申请可经过补充资料后再次提交并通过演示审核", () => {
  adapter.reset();
  adapter.submitPartnerApplication({ name: "演示陪诊服务站", region: "杭州·拱墅区", category: "陪诊就医" });
  assert.equal(adapter.getPartnerApplication().status, "pending_review");

  adapter.reviewPartnerApplication("request_more", "请补充服务范围");
  assert.equal(adapter.getPartnerApplication().status, "needs_update");

  adapter.submitPartnerApplication({ name: "演示陪诊服务站", region: "杭州·拱墅区", category: "陪诊就医" });
  adapter.reviewPartnerApplication("approve", "演示审核通过");
  assert.equal(adapter.getPartnerApplication().status, "approved");
  assert.equal(adapter.getPartnerApplication().events.length, 4);
});

test("已通过的服务方不能重复提交入驻申请", () => {
  adapter.reset();
  adapter.submitPartnerApplication({ name: "演示服务站", region: "杭州", category: "陪诊就医" });
  adapter.reviewPartnerApplication("approve");
  assert.throws(
    () => adapter.submitPartnerApplication({ name: "演示服务站", region: "杭州", category: "陪诊就医" }),
    /已通过/
  );
});
