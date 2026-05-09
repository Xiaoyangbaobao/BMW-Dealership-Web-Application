import models from "@/data/models.json";

export type CarModel = {
  id: string;
  name: string;
  series: string;
  price: number;
  year: number;
  range: string;
  horsepower: number;
  heroImage: string;
  modelPath?: string;
  description: string;
};

export const bmwModels = models as CarModel[];

export const getModelById = (id: string) =>
  bmwModels.find((model) => model.id === id);
