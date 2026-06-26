const toNumber = (value: string | number | null | undefined) => {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const getOrderPricing = (order: any) => {
  const discountedSubtotal = toNumber(order?.subtotal);
  const shippingFee = toNumber(order?.shipping_fee);
  const platformDiscount = toNumber(order?.platform_discount_amount);
  const itemSubtotal = Array.isArray(order?.items)
    ? order.items.reduce(
        (sum: number, item: any) =>
          sum + toNumber(item?.price_at_purchase) * toNumber(item?.quantity),
        0,
      )
    : discountedSubtotal;

  const shopDiscount = Math.max(0, itemSubtotal - discountedSubtotal);
  const totalVoucherDiscount = shopDiscount + platformDiscount;
  const finalTotal = Math.max(0, discountedSubtotal + shippingFee - platformDiscount);

  return {
    itemSubtotal,
    discountedSubtotal,
    shippingFee,
    shopDiscount,
    platformDiscount,
    totalVoucherDiscount,
    finalTotal,
  };
};
