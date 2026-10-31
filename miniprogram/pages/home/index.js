const PROVIDERS = [
  {
    id: "provider-01",
    name: "安心陪诊 · 拱墅服务站",
    service: "陪同就医",
    category: "陪诊就医",
    price: 80,
    distance: "约 1.2 km",
    hours: "周一至周六可预约",
    artClass: ""
  },
  {
    id: "provider-02",
    name: "和邻居家清洁服务",
    service: "居家清洁",
    category: "上门助洁",
    price: 55,
    distance: "约 2.4 km",
    hours: "服务前确认范围与时长",
    artClass: "provider-art-b"
  }
];
const api = require("../../services/api");

Page({
  data: {
    providers: PROVIDERS,
    selectedCategory: "",
    keyword: "",
    largeText: false
  },

  onShow() {
    this.setData({ largeText: api.getLargeText() });
  },

  onSearch(event) {
    this.setData({ keyword: event.detail.value }, () => this.filterProviders());
  },

  onCategory(event) {
    const category = event.currentTarget.dataset.category;
    this.setData({
      selectedCategory: this.data.selectedCategory === category ? "" : category
    }, () => this.filterProviders());
  },

  filterProviders() {
    const category = this.data.selectedCategory;
    const keyword = this.data.keyword.trim().toLowerCase();
    const providers = PROVIDERS.filter((provider) => {
      const categoryMatch = !category || provider.category === category;
      const keywordMatch = !keyword || `${provider.name}${provider.service}${provider.category}`.toLowerCase().includes(keyword);
      return categoryMatch && keywordMatch;
    });
    this.setData({ providers });
  },

  openProvider(event) {
    wx.navigateTo({ url: `/pages/provider/index?id=${event.currentTarget.dataset.id}` });
  },

  createDemand() {
    const category = this.data.selectedCategory;
    const suffix = category ? `?category=${encodeURIComponent(category)}` : "";
    wx.navigateTo({ url: `/pages/publish/index${suffix}` });
  }
});
