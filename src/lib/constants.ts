export const SUPPORTED_PAYMENT_METHODS = [
  "card",
  "cardPresent",
  "googlePay",
  "applePay",
  "clickToPay",
  "bizum",
  "paypal",
  "mbway",
  "multibanco",
  "iDeal",
  "bancontact",
  "sofort",
  "trustly",
  "sepa",
  "srtp",
  "klarna",
  "giropay",
  "eps",
  "blik",
  "alipay",
] as const;

export const DEFAULT_PAYMENT_METHODS = ["card", "bizum", "paypal"] as const;
