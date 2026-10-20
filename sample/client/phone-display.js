// Display local Hong Kong numbers without changing stored contact details.
export const phoneDisplay=value=>typeof value==='string'?value.replace(/^\s*\+852[\s-]*/, ''):value;
