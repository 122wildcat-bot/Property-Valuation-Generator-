import { z } from "zod";

const AddressSchema = z.object({
  street: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(2),
  zip: z.string().min(5),
});

const LastSaleSchema = z.object({
  price: z.number().positive(),
  date: z.string().min(1),
});

const SubjectSchema = z.object({
  address: AddressSchema,
  municipality: z.string().min(1),
  school_district: z.string().min(1),
  structure_type: z.string().min(1),
  beds: z.number().int().nonnegative(),
  baths_full: z.number().int().nonnegative(),
  baths_half: z.number().int().nonnegative(),
  living_area_sqft: z.number().positive(),
  parking: z.string().min(1),
  last_sale: LastSaleSchema,
  current_tax_annual: z.number().nonnegative(),
  current_rent_monthly: z.number().nonnegative(),
});

const ScenarioTierSchema = z.enum(["as_is", "recommended", "top_of_market"]);

const ScenarioSchema = z.object({
  tier: ScenarioTierSchema,
  label: z.string().min(1),
  range_low: z.number().positive(),
  range_high: z.number().positive(),
  point_estimate: z.number().positive(),
  price_per_sqft: z.number().positive(),
});

const CompSchema = z.object({
  address: z.string().min(1),
  status: z.string().min(1),
  dom: z.number().int().nonnegative().optional(),
  price: z.number().positive(),
  price_history: z.array(z.number().positive()).optional(),
  close_date: z.string().optional(),
  price_per_sqft: z.number().positive(),
  beds: z.number().int().nonnegative(),
  baths_full: z.number().int().nonnegative(),
  baths_half: z.number().int().nonnegative(),
  sqft: z.number().positive(),
  parking: z.string().min(1),
  condition_notes: z.string().min(1),
  anchor_role: z.string().optional(),
});

const AgentSchema = z.object({
  name: z.string().min(1),
  title: z.string().min(1).optional(),
  phone: z.string().min(1).optional(),
  email: z.string().min(1).optional(),
  license_number: z.string().min(1).optional(),
  headshot_data_url: z
    .string()
    .regex(/^data:image\/(jpeg|jpg|png|webp);base64,/, "headshot_data_url must be a data:image/...;base64,... URL")
    .optional(),
});

export const ValuationInputSchema = z
  .object({
    subject: SubjectSchema,
    neighborhood_context: z.string().min(1),
    scenarios: z
      .array(ScenarioSchema)
      .length(3, "Exactly 3 scenarios required: as_is, recommended, top_of_market"),
    comps: z.array(CompSchema).min(3).max(8),
    constraints: z.array(z.string()).default([]),
    important_market_context: z.string().min(1),
    agent: AgentSchema.optional(),
  })
  .superRefine((data, ctx) => {
    const tiers = data.scenarios.map((s) => s.tier).sort();
    const expected = ["as_is", "recommended", "top_of_market"].sort();
    if (JSON.stringify(tiers) !== JSON.stringify(expected)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["scenarios"],
        message: "scenarios must include exactly one of each tier: as_is, recommended, top_of_market",
      });
    }
  });

export type ValuationInput = z.infer<typeof ValuationInputSchema>;
