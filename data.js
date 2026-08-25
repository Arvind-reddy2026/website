const defaultSiteData = {
  profile: {
    name: "Arvind Reddy",
    party: "BJP",
    constituency: "Anekal",
    taglineEn: "With the people. For Anekal.",
    taglineKn: "ಜನರೊಂದಿಗೆ. ಆನೇಕಲ್‌ಗಾಗಿ.",
    aboutEn: "This space is ready for Arvind Reddy's verified biography, political journey, responsibilities and public-service milestones.",
    aboutKn: "ಅರವಿಂದ್ ರೆಡ್ಡಿಯವರ ಪರಿಶೀಲಿತ ಜೀವನಚರಿತ್ರೆ, ರಾಜಕೀಯ ಪಯಣ, ಜವಾಬ್ದಾರಿಗಳು ಮತ್ತು ಸಾರ್ವಜನಿಕ ಸೇವೆಯ ಮೈಲಿಗಲ್ಲುಗಳಿಗಾಗಿ ಈ ವಿಭಾಗವನ್ನು ಸಿದ್ಧಪಡಿಸಲಾಗಿದೆ."
  },
  contact: {
    phone: "",
    email: "",
    whatsapp: "",
    office: "",
    instagram: "",
    facebook: "",
    youtube: ""
  },
  news: [],
  events: [],
  gallery: []
};

function loadSiteData() {
  try {
    const saved = localStorage.getItem("arvindReddySiteData");
    return saved ? {...defaultSiteData, ...JSON.parse(saved)} : structuredClone(defaultSiteData);
  } catch {
    return structuredClone(defaultSiteData);
  }
}
function saveSiteData(data) {
  localStorage.setItem("arvindReddySiteData", JSON.stringify(data));
}
