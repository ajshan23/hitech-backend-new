import Joi from "joi";

// Define the schema for job card input validation
const jobCardSchema = Joi.object({
  customerName: Joi.string().required().messages({
    "any.required": "Customer name is required",
    "string.empty": "Customer name cannot be empty",
  }),
  customerAddress: Joi.string().required().messages({
    "any.required": "Customer address is required",
    "string.empty": "Customer address cannot be empty",
  }),
  phoneNumber: Joi.string().required().messages({
    "any.required": "Phone number is required",
    "string.empty": "Phone number cannot be empty",
  }),
  Make: Joi.string().optional(),
  HP: Joi.number().optional(),
  KVA: Joi.number().optional(),
  RPM: Joi.number().optional(),
  Type: Joi.string().optional(),
  Frame: Joi.string().optional(),
  SrNo: Joi.string().required().messages({
    "any.required": "Serial number is required",
    "string.empty": "Serial number cannot be empty",
  }),
  DealerName: Joi.string().optional(),
  DealerNumber: Joi.string().optional(),
  works: Joi.string().optional(),
  spares: Joi.string().optional(),
  industrialworks: Joi.string().optional(),
  attachments: Joi.array().items(Joi.string()).optional(),
  warranty: Joi.boolean().optional(),
  others: Joi.string().optional(),
});

// Validate job card input
export const validateJobCardInput = (data: any) => {
  return jobCardSchema.validate(data, { abortEarly: false });
};