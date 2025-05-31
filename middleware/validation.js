const Joi = require('joi');

const validateRegistration = (req, res, next) => {
  const schema = Joi.object({
    username: Joi.string().min(3).max(30).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  next();
};

const validateLogin = (req, res, next) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required()
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  next();
};

const validateTransaction = (req, res, next) => {
  const schema = Joi.object({
    amount: Joi.number().positive().precision(2).required(),
    currency: Joi.string().valid('USD', 'EUR', 'BTC', 'ETH').default('USD'),
    description: Joi.string().max(500).optional(),
    toUserId: Joi.string().when('type', {
      is: 'transfer',
      then: Joi.required(),
      otherwise: Joi.optional()
    })
  });

  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }
  next();
};

module.exports = {
  validateRegistration,
  validateLogin,
  validateTransaction
};