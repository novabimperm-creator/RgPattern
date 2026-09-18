export const ORGAN_SYSTEMS = [
  {
    id: "nervous",
    label: "Нервная система",
    organs: "головной и спинной мозг, нервы",
    description: "Управляет работой всего организма и реакциями на внешнюю среду.",
  },
  {
    id: "cardiovascular",
    label: "Сердечно-сосудистая (кровеносная) система",
    organs: "сердце и кровеносные сосуды",
    description: "Переносит кровь, кислород и питательные вещества.",
  },
  {
    id: "digestive",
    label: "Пищеварительная система",
    organs: "желудок, кишечник, печень",
    description: "Перерабатывает пищу и усваивает питательные вещества.",
  },
  {
    id: "respiratory",
    label: "Дыхательная система",
    organs: "лёгкие, дыхательные пути",
    description: "Обеспечивает газообмен — поступление кислорода и выведение углекислого газа.",
  },
  {
    id: "urinary",
    label: "Мочевыделительная система",
    organs: "почки, мочевой пузырь",
    description: "Очищает кровь и выводит жидкие отходы.",
  },
  {
    id: "musculoskeletal",
    label: "Опорно-двигательная система",
    organs: "кости, суставы, мышцы",
    description: "Даёт опору телу и позволяет двигаться.",
  },
  {
    id: "integumentary",
    label: "Покровная система",
    organs: "кожа, волосы, ногти",
    description: "Защищает тело от повреждений и инфекций.",
  },
  {
    id: "endocrine",
    label: "Эндокринная система",
    organs: "железы внутренней секреции, такие как щитовидная железа, надпочечники",
    description: "Регулирует процессы в теле с помощью гормонов.",
  },
  {
    id: "lymphatic",
    label: "Лимфатическая система",
    organs: "лимфатические узлы, сосуды",
    description: "Защищает от болезней и поддерживает баланс жидкости.",
  },
  {
    id: "reproductive",
    label: "Репродуктивная (половая) система",
    organs: "яичники у женщин, семенники у мужчин",
    description: "Отвечает за продолжение рода.",
  },
] as const;

export type OrganSystemId = (typeof ORGAN_SYSTEMS)[number]["id"];

export function isOrganSystemId(value: string): value is OrganSystemId {
  return ORGAN_SYSTEMS.some((item) => item.id === value);
}

export function organSystemById(id: string | undefined) {
  if (!id) return undefined;
  return ORGAN_SYSTEMS.find((item) => item.id === id);
}

export function organSystemSearchText(id: string | undefined): string {
  const item = organSystemById(id);
  if (!item) return "";
  return `${item.label} ${item.organs} ${item.description}`;
}

export function parseOrganSystem(value: unknown): OrganSystemId | null {
  return typeof value === "string" && isOrganSystemId(value) ? value : null;
}
