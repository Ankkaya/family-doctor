export type Medicine = {
  id: string;
  inventoryId?: string;
  medicineId?: string;
  name: string;
  expiry: string;
  indication: string;
  contraindications: string;
  adverseReactions: string;
  otc: "OTC" | "Rx";
  barcode: string;
  approvalNumber?: string;
  dosage?: string;
  manufacturer?: string;
  source: string;
  quantity?: number;
};

export type ChatCard = {
  medicineId: string;
  summary: string;
  name?: string;
  otc?: "OTC" | "Rx";
  indication?: string;
  warnings?: string[];
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  statusText?: string;
  disclaimer?: string;
  cards?: ChatCard[];
  timestamp: string;
};

export type HistorySession = {
  id: string;
  title: string;
  date: string;
  time: string;
  summary: string;
  messages: ChatMessage[];
};

export const medicines: Medicine[] = [
  {
    id: "ibu",
    name: "布洛芬缓释胶囊",
    expiry: "2026-12-31",
    indication: "头痛、发热、肌肉酸痛的短期缓解",
    contraindications: "胃溃疡、消化道出血史、孕晚期人群慎用",
    adverseReactions: "可能出现胃部不适、恶心、头晕",
    otc: "OTC",
    barcode: "6901234567890",
    source: "手动录入",
  },
  {
    id: "lhqw",
    name: "连花清瘟胶囊",
    expiry: "2025-11-20",
    indication: "发热、咳嗽、咽干咽痛等上呼吸道不适",
    contraindications: "风寒感冒者、孕妇及脾胃虚寒者慎用",
    adverseReactions: "偶见腹泻、胃胀、皮疹",
    otc: "OTC",
    barcode: "6923456789012",
    source: "图片识别",
  },
  {
    id: "amx",
    name: "阿莫西林胶囊",
    expiry: "2027-03-15",
    indication: "细菌感染相关炎症的处方用药",
    contraindications: "青霉素过敏人群禁用",
    adverseReactions: "可能出现皮疹、腹泻、恶心",
    otc: "Rx",
    barcode: "6945678901234",
    source: "条码录入",
  },
  {
    id: "hxzq",
    name: "藿香正气水",
    expiry: "2026-08-05",
    indication: "腹泻、恶心、胃肠型感冒不适",
    contraindications: "酒精敏感者、儿童及孕妇慎用",
    adverseReactions: "可能出现口干、轻度胃部刺激",
    otc: "OTC",
    barcode: "6956789012345",
    source: "手动录入",
  },
];

export const demoAssistantReply: ChatMessage = {
  id: "assistant-current",
  role: "assistant",
  text: "根据你描述的头痛发热情况，当前可优先关注退热止痛类药物，同时注意补水和休息。如持续高热或症状加重，应尽快线下就诊。",
  timestamp: "刚刚",
  cards: [
    {
      medicineId: "ibu",
      summary: "适合短期缓解头痛、发热，属于常见 OTC 药品。",
    },
    {
      medicineId: "lhqw",
      summary: "适合伴随咽痛、咳嗽等上呼吸道不适时参考。",
    },
  ],
};

export const initialChatMessages: ChatMessage[] = [
];

export const historySessions: HistorySession[] = [
  {
    id: "history-1",
    title: "头痛发热",
    date: "今天",
    time: "09:20",
    summary: "推荐了布洛芬缓释胶囊和连花清瘟胶囊。",
    messages: [
      {
        id: "h1-u1",
        role: "user",
        text: "这两天有些头痛发热，家里有什么药可以先看看？",
        timestamp: "09:18",
      },
      demoAssistantReply,
    ],
  },
  {
    id: "history-2",
    title: "咳嗽喉咙痛",
    date: "今天",
    time: "08:05",
    summary: "建议先看 OTC 药品适应症，并观察症状变化。",
    messages: [
      {
        id: "h2-u1",
        role: "user",
        text: "咳嗽伴随喉咙痛，应该先看哪些药？",
        timestamp: "08:03",
      },
      {
        id: "h2-a1",
        role: "assistant",
        text: "可以先关注连花清瘟胶囊等用于上呼吸道不适的 OTC 药品，同时留意是否有高热或持续加重情况。",
        timestamp: "08:05",
        cards: [
          {
            medicineId: "lhqw",
            summary: "适应症覆盖发热、咽痛、咳嗽等不适。",
          },
        ],
      },
    ],
  },
  {
    id: "history-3",
    title: "腹泻恶心",
    date: "昨天",
    time: "21:15",
    summary: "推荐藿香正气水，并提示补水。",
    messages: [
      {
        id: "h3-u1",
        role: "user",
        text: "有点腹泻恶心，家里药箱能先看什么？",
        timestamp: "21:12",
      },
      {
        id: "h3-a1",
        role: "assistant",
        text: "可优先查看藿香正气水等针对胃肠不适的药品，并注意补水、饮食清淡。",
        timestamp: "21:15",
        cards: [
          {
            medicineId: "hxzq",
            summary: "常用于胃肠型感冒、腹泻、恶心等不适。",
          },
        ],
      },
    ],
  },
  {
    id: "history-4",
    title: "药品是否快过期",
    date: "3 天前",
    time: "19:40",
    summary: "查看了连花清瘟胶囊的有效期和禁忌人群。",
    messages: [
      {
        id: "h4-u1",
        role: "user",
        text: "想看看连花清瘟还有多久过期。",
        timestamp: "19:38",
      },
      {
        id: "h4-a1",
        role: "assistant",
        text: "该药有效期到 2025-11-20，可在药品详情页查看更多风险提示。",
        timestamp: "19:40",
      },
    ],
  },
  {
    id: "history-5",
    title: "儿童用药提醒",
    date: "6 天前",
    time: "15:10",
    summary: "提示先看禁忌人群与说明书，不直接给真实医学结论。",
    messages: [
      {
        id: "h5-u1",
        role: "user",
        text: "儿童发热能不能直接用家里的药？",
        timestamp: "15:08",
      },
      {
        id: "h5-a1",
        role: "assistant",
        text: "建议先查看药品详情中的禁忌人群和说明书，并根据年龄与剂量信息谨慎判断。",
        timestamp: "15:10",
      },
    ],
  },
];
