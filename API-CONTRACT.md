# API 接口预留（Mock 版契约）

本文定义前端与未来服务端的边界。当前演示版使用设备本地 Storage Mock Adapter，不发网络请求、不保存真实个人信息；下列路径仅供后续实现，不代表接口已部署。

## 通用约定

- Base path：`/api/v1`
- JSON UTF-8；时间使用 ISO 8601 带时区格式。
- 错误格式：`{ "code": "INVALID_STATE", "message": "...", "details": {} }`
- 所有写操作支持 `Idempotency-Key`；并发更新使用 `version` 或 `If-Match`。
- 电话、精确地址等敏感字段只在用户授权且订单匹配后向指定服务方开放。
- 真实登录、授权、备案、服务方核验、支付及消息提供商接入均不在 Mock 范围内。

## 状态枚举

### Demand

`DRAFT → OPEN → MATCHED → BOOKING_PROPOSED → BOOKED → IN_SERVICE → COMPLETION_PENDING → COMPLETED → CLOSED`

可从预约确认前状态进入 `CANCELLED`；预约确认后取消需进入 `CANCEL_REQUESTED`，经另一方同意或运营介入后再关闭。`OPEN` 收到服务方拒绝/响应超时后仍为 `OPEN`，保留响应记录。

### Booking

`PROPOSED → CONFIRMED → IN_SERVICE → COMPLETION_PENDING → COMPLETED`

异常态：`CANCEL_REQUESTED`、`CANCELLED`、`RESCHEDULE_REQUESTED`、`DISPUTED`。服务单内容由家属确认并发起提案，服务方再确认后预约成立。终态不允许普通更新；投诉单是独立实体，不覆盖预约状态。

### Complaint

`SUBMITTED → ACCEPTED → INVESTIGATING → RESOLUTION_PROPOSED → RESOLVED`

用户可在结果阶段 `REOPENED` 申请复核；运营关闭后进入 `CLOSED`。每次变更须有处理人、时间和说明。

## 端点建议

### 需求

- `POST /demands` 创建需求。请求：`categoryId`, `regionId`, `timeWindow`, `mobility`（可选）, `note`（可选）, `contactConsent`。
- `GET /demands/{demandId}` 查询需求、当前状态、服务方响应摘要和事件时间线。
- `GET /demands?role=consumer&status=...` 查询我的需求。
- `POST /demands/{demandId}/withdraw` 撤回未确认需求。请求：`reasonCode`, `note`。

### 服务方与响应

- `POST /provider-applications` 服务方提交入驻申请。请求：`displayName`, `categoryIds`, `serviceRegions`。
- `GET /provider-applications/{applicationId}` 查询申请状态与审核事件。
- `POST /ops/provider-applications/{applicationId}/review` 通过/要求补充/拒绝。请求：`decision`, `note`, `verifiedFields`。
- `GET /providers?regionId=...&categoryId=...` 查询服务方目录。
- `GET /providers/{providerId}` 查看公开资料、核验摘要、评价和服务项目。
- `POST /demands/{demandId}/responses` 服务方响应/拒绝。请求：`providerId`, `decision`, `quote`, `availableWindows`, `message`。
- `POST /demands/{demandId}/selection` 用户选择服务方。请求：`responseId`。

### 预约与履约

- `POST /bookings` 从已选择响应创建预约提案。请求：`demandId`, `responseId`, `serviceSnapshot`, `timeWindow`, `locationSnapshot`, `priceSnapshot`, `cancellationTerms`。
- `POST /bookings/{bookingId}/confirm` 服务方确认提案。
- `POST /bookings/{bookingId}/cancel-requests` 发起取消申请。请求：`reasonCode`, `note`。
- `POST /bookings/{bookingId}/cancel-requests/{requestId}/decision` 对方接受/拒绝取消。请求：`decision`, `note`。
- `POST /bookings/{bookingId}/reschedule-requests` 发起改期。请求：`timeWindow`, `reason`。
- `POST /bookings/{bookingId}/reschedule-requests/{requestId}/decision` 对方接受/拒绝改期。请求：`decision`, `note`。
- `POST /bookings/{bookingId}/start` 服务方标记开始服务。
- `POST /bookings/{bookingId}/completion` 服务方提交完成说明。
- `POST /bookings/{bookingId}/completion-confirmation` 用户确认完成或提出异议。请求：`decision`, `note`。
- `GET /bookings/{bookingId}` 查询预约快照、参与方可执行动作和时间线。

### 评价、投诉与运营

- `POST /bookings/{bookingId}/reviews` 完成后评价。请求：`rating`, `tags`, `comment`。
- `POST /bookings/{bookingId}/complaints` 创建投诉。请求：`category`, `description`, `requestedResolution`。
- `GET /complaints/{complaintId}` 查询处理进度和处理记录。
- `POST /complaints/{complaintId}/evidence` 补充材料（真实版需受控上传、权限与留存策略）。
- `POST /complaints/{complaintId}/reopen` 申请复核。
- `POST /complaints/{complaintId}/confirm-resolution` 用户确认处理结果并关闭投诉。
- `POST /ops/providers/{providerId}/review` 运营审核服务方。
- `POST /ops/providers/{providerId}/suspend` 暂停展示/接单。
- `POST /ops/complaints/{complaintId}/resolution` 记录投诉结论。

## 事件时间线对象

```json
{
  "id": "evt_demo_001",
  "entityType": "booking",
  "entityId": "booking_demo_001",
  "type": "PROVIDER_CONFIRMED",
  "actor": { "role": "provider", "id": "provider_demo_001" },
  "createdAt": "2026-10-31T10:00:00+08:00",
  "summary": "服务方已确认预约",
  "metadata": {}
}
```

## Mock Adapter 替换原则

- 页面只依赖 `DemandApi`、`ProviderApi`、`BookingApi`、`ReviewApi`、`ComplaintApi`、`OpsApi` 方法，不直接调用 `fetch`。
- Mock Adapter 提供固定种子数据、可控延迟、失败注入与重置演示；状态转换校验与接口实现分离。
- 未来切换真实 API 时按同一 DTO 和状态枚举实现 HTTP Adapter；由服务端作为状态和权限的最终权威。
- Mock 数据始终加“演示数据”标记；禁止把演示联系方式或评价冒充真实用户内容。
