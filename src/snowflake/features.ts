class Features {
  private features: Record<string, string> = {};

  setFeature(feature: string, value: string): void {
    this.features[feature] = value;
  }

  addStats({
    mass,
    radius,
    time,
  }: {
    mass: number;
    radius: number;
    time: number;
  }): void {
    this.setFeature("Mass", getLabel("mass", mass));
    this.setFeature("Growth Rate", getLabel("growthRate", radius / time));
  }

  registerFeatures(): void {
    window.$fxhashFeatures = { ...this.features };
  }

  getFeatures(): Record<string, string> {
    return { ...this.features };
  }
}

function getLabel(type: "mass" | "growthRate", value: number): string {
  for (const bp of breakpoints[type]) {
    if (value < bp.max) {
      return bp.label;
    }
  }
  throw new Error(`No label found for ${type} ${value}`);
}

const breakpoints = {
  mass: [
    { label: "Very Low", max: 10421.65 },
    { label: "Low", max: 14749.5 },
    { label: "Medium", max: 23161.25 },
    { label: "High", max: 30253.24 },
    { label: "Very High", max: Infinity },
  ],
  growthRate: [
    { label: "Very Slow", max: 0.0024 },
    { label: "Slow", max: 0.00638674 },
    { label: "Medium", max: 0.06758936 },
    { label: "Fast", max: 0.14358974 },
    { label: "Very Fast", max: Infinity },
  ],
};

export const features = new Features();
